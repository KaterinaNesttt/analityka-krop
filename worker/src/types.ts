export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ADMIN_BOOTSTRAP_EMAIL?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
  ALLOWED_ORIGIN: string;
}

export type Role = 'admin' | 'moderator' | 'user';
export type UserStatus = 'pending' | 'approved' | 'blocked';
export type SaleStatus = 'pending' | 'approved' | 'rejected' | 'duplicate';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: UserStatus;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  status: UserStatus;
  iat: number;
  exp: number;
}
