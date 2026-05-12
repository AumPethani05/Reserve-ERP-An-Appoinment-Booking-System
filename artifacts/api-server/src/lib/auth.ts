import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error(
    'WARNING: JWT_SECRET and/or JWT_REFRESH_SECRET are not set. ' +
    'Auth endpoints will return 503 until these secrets are configured.'
  );
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: 'patient' | 'provider' | 'admin';
}

function requireSecret(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} environment variable is not configured`);
  return value;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, requireSecret('JWT_SECRET', JWT_SECRET), { expiresIn: '15m' });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, requireSecret('JWT_REFRESH_SECRET', JWT_REFRESH_SECRET), { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, requireSecret('JWT_SECRET', JWT_SECRET)) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, requireSecret('JWT_REFRESH_SECRET', JWT_REFRESH_SECRET)) as TokenPayload;
}

export function generateTokens(payload: TokenPayload) {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieToken = req.cookies?.accessToken;
  return cookieToken || null;
}

export function authenticateRequest(req: Request): TokenPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response): TokenPayload | null {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    res.status(503).json({ error: 'Authentication service is not configured' });
    return null;
  }
  const payload = authenticateRequest(req);
  if (!payload) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return payload;
}

export function requireRole(req: Request, res: Response, ...roles: string[]): TokenPayload | null {
  const payload = requireAuth(req, res);
  if (!payload) return null;
  if (!roles.includes(payload.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return null;
  }
  return payload;
}
