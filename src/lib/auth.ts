import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { queryOne } from './db';
import type { User } from './types';

// ============================================================
// Password hashing (bcrypt, 12 rounds)
// ============================================================

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================
// JWT token management
// ============================================================

const JWT_COOKIE_NAME = 'webmonitor_token';
const JWT_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters long.'
    );
  }
  return secret;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export function createToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as JwtPayload,
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================
// Cookie management for auth tokens
// ============================================================

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: '/',
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(JWT_COOKIE_NAME);
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(JWT_COOKIE_NAME);
  return cookie?.value ?? null;
}

// ============================================================
// Get the authenticated user from the request cookie
// Returns the full user object or null if not authenticated
// ============================================================

export async function getAuthUser(): Promise<User | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Fetch fresh user data from DB (not just from JWT)
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE id = $1',
    [payload.userId]
  );

  return user;
}

// ============================================================
// Auth guard: throw if not authenticated
// ============================================================

export async function requireAuth(): Promise<User> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// ============================================================
// Validation helpers
// ============================================================

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (password.length > 128) {
    return 'Password must be at most 128 characters long';
  }
  return null; // valid
}
