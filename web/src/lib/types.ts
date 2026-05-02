export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  imageUrl: string | null;
  categoryId: string;
};

export type Paginated<T> = {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type Address = {
  id: string;
  userId: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
};

export type OrderStatus =
  | "CREATED"
  | "ACCEPTED"
  | "PREPARING"
  | "ON_THE_WAY"
  | "DELIVERED";

export type OrderSummary = {
  id: string;
  status: OrderStatus;
  totalPrice: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    productId: string;
  }>;
  courier?: { id: string; name: string } | null;
};

export type OrderDetail = OrderSummary & {
  deliverySnapshot: Record<string, unknown>;
  payments?: Array<{ id: string; amount: string; status: string }>;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
};

export type AdminStats = {
  ordersToday: number;
  revenue: string;
  activeOrders: number;
  allTimeOrderCount: number;
};

export type AdminOrderListItem = {
  id: string;
  userId: string;
  status: OrderStatus;
  totalPrice: string;
  createdAt: string;
  customer: { id: string; email: string; name: string | null };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    productId: string;
  }>;
  courier: { id: string; name: string } | null;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
};

export type CourierRow = {
  id: string;
  name: string;
  phone: string;
  vehicle: string | null;
  isAvailable: boolean;
  currentLat: number | null;
  currentLng: number | null;
};

/** Courier panel order row (`GET /courier/orders`). */
export type CourierOrderRow = {
  id: string;
  status: OrderStatus;
  totalPrice: string;
  createdAt: string;
  deliverySnapshot: Record<string, unknown>;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    productId: string;
    productSnapshot: unknown;
  }>;
  customer: {
    email: string;
    name: string | null;
    phone: string | null;
  };
};
