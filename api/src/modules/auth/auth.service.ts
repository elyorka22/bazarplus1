import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

const REFRESH_BYTES = 48;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateOpaqueRefreshToken(): string {
    return randomBytes(REFRESH_BYTES).toString('base64url');
  }

  private refreshExpiresAt(): Date {
    const days = 7;
    const ms = days * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ms);
  }

  async register(dto: RegisterDto) {
    const existing = await this.authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
      phone: dto.phone,
      role: Role.USER,
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.authRepository.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    const hash = this.hashRefreshToken(refreshToken);
    const record = await this.authRepository.findRefreshTokenByHash(hash);
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.authRepository.deleteRefreshToken(record.id);
    return this.issueTokens(
      record.user.id,
      record.user.email,
      record.user.role,
    );
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hash = this.hashRefreshToken(refreshToken);
      const record = await this.authRepository.findRefreshTokenByHash(hash);
      if (record && record.userId === userId) {
        await this.authRepository.deleteRefreshToken(record.id);
      }
      return { loggedOut: true };
    }
    await this.authRepository.deleteRefreshTokensForUser(userId);
    return { loggedOut: true };
  }

  private async issueTokens(sub: string, email: string, role: Role) {
    const payload: JwtPayload = { sub, email, role };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = this.generateOpaqueRefreshToken();
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.authRepository.createRefreshToken({
      userId: sub,
      tokenHash,
      expiresAt: this.refreshExpiresAt(),
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<string>('jwtAccessExpires'),
    };
  }
}
