import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'shipyard-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Signs a JWT token containing the user's ID.
 */
export function signToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };
  return jwt.sign({ userId }, JWT_SECRET, options);
}

/**
 * Verifies a JWT token and returns the decoded payload containing userId, or null if invalid.
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
      const payload = decoded as JwtPayload & { userId: string };
      if (typeof payload.userId === 'string') {
        return { userId: payload.userId };
      }
    }
    return null;
  } catch {
    return null;
  }
}
