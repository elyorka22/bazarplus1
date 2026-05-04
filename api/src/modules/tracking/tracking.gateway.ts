import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OrderStatus, Role } from '@prisma/client';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';
import { Namespace, type Server, type Socket } from 'socket.io';
import { buildSocketIoCors } from '../../config/socket-io-cors';
import type { AdminBroadcastOrderListItem } from '../../infrastructure/events/order-events.publisher';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CourierService } from '../courier/courier.service';

const ADMIN_ROOM = 'admin';

function resolveMainServer(serverOrNamespace: Server | Namespace): Server {
  return serverOrNamespace instanceof Namespace
    ? serverOrNamespace.server
    : serverOrNamespace;
}

@WebSocketGateway({
  namespace: '/tracking',
  cors: buildSocketIoCors(),
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayInit {
  private static readonly ioWithRedisAdapter = new WeakSet<Server>();

  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly courierService: CourierService,
  ) {}

  afterInit(serverOrNamespace: Server | Namespace): void {
    const io = resolveMainServer(serverOrNamespace);
    void this.attachRedisAdapter(io).catch((err: unknown) => {
      this.logger.error(
        'Unexpected error while attaching Redis adapter',
        err instanceof Error ? err.stack : String(err),
      );
    });
  }

  private async attachRedisAdapter(io: Server): Promise<void> {
    if (TrackingGateway.ioWithRedisAdapter.has(io)) {
      return;
    }

    let pubClient: RedisClientType | undefined;
    let subClient: RedisClientType | undefined;

    try {
      const url = this.config.getOrThrow<string>('redisUrl');
      pubClient = createClient({ url });
      subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      io.adapter(createAdapter(pubClient, subClient));
      TrackingGateway.ioWithRedisAdapter.add(io);

      this.logger.log(
        'Socket.IO Redis adapter enabled (main server; all namespaces)',
      );
    } catch (err) {
      this.logger.warn(
        `Socket.IO Redis adapter skipped — using default in-memory adapter (${err instanceof Error ? err.message : String(err)})`,
      );

      const safeClose = async (client: RedisClientType | undefined) => {
        if (!client) return;
        try {
          if (client.isOpen) {
            await client.quit();
          } else {
            await client.disconnect();
          }
        } catch {
          try {
            await client.disconnect();
          } catch {
            /* ignore */
          }
        }
      };

      await safeClose(pubClient);
      await safeClose(subClient);
    }
  }

  async handleConnection(client: Socket) {
    const raw = client.handshake.auth?.token as string | undefined;
    if (!raw) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(raw, {
        secret: this.config.getOrThrow<string>('jwtAccessSecret'),
      });
      (client.data as { user?: JwtPayload }).user = payload;
      if (payload.role === Role.ADMIN) {
        await client.join(ADMIN_ROOM);
      }
      const courier = await this.prisma.courier.findUnique({
        where: { userId: payload.sub },
      });
      if (courier) {
        await client.join(`courier:${courier.id}`);
      }
    } catch {
      this.logger.warn('WS auth failed');
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId: string },
  ) {
    const user = (client.data as { user?: JwtPayload }).user;
    if (!user || !body?.orderId) {
      client.emit('error', { message: 'Invalid join payload' });
      return;
    }
    const order = await this.prisma.order.findUnique({
      where: { id: body.orderId },
      select: { userId: true },
    });
    if (!order || (order.userId !== user.sub && user.role !== Role.ADMIN)) {
      client.emit('error', { message: 'Forbidden' });
      return;
    }
    await client.join(this.roomFor(body.orderId));
    client.emit('joined', { orderId: body.orderId });
  }

  async emitOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const body = { orderId, status };
    this.server.to(this.roomFor(orderId)).emit('order:status', body);
    this.server.to(ADMIN_ROOM).emit('order:status.updated', body);
    const row = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { courierId: true },
    });
    if (row?.courierId) {
      this.server
        .to(`courier:${row.courierId}`)
        .emit('order:status.updated', body);
    }
  }

  emitCourierLocation(
    orderId: string,
    payload: {
      orderId: string;
      courierId: string;
      lat: number;
      lng: number;
    },
  ): void {
    this.server.to(this.roomFor(orderId)).emit('courier:location', payload);
    this.server.to(ADMIN_ROOM).emit('courier:location.updated', payload);
  }

  emitOrderCreated(order: AdminBroadcastOrderListItem): void {
    this.server.to(ADMIN_ROOM).emit('order:created', order);
  }

  emitCourierAssigned(
    orderId: string,
    courier: { id: string; name: string },
  ): void {
    this.server.to(ADMIN_ROOM).emit('courier:assigned', { orderId, courier });
    this.server.to(`courier:${courier.id}`).emit('order:assigned', {
      orderId,
      courierId: courier.id,
    });
  }

  @SubscribeMessage('courier:location.update')
  async courierLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { lat?: number; lng?: number },
  ): Promise<void> {
    const user = (client.data as { user?: JwtPayload }).user;
    if (
      !user ||
      typeof body?.lat !== 'number' ||
      typeof body?.lng !== 'number'
    ) {
      return;
    }
    const courier = await this.prisma.courier.findUnique({
      where: { userId: user.sub },
    });
    if (!courier) {
      return;
    }
    await this.courierService.updateLocation(courier.id, {
      lat: body.lat,
      lng: body.lng,
    });
  }

  private roomFor(orderId: string): string {
    return `order:${orderId}`;
  }
}
