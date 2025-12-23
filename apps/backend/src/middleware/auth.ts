import { Context, Next } from 'hono';

/**
 * Simple authentication middleware for Hono backend
 *
 * In production, this should integrate with Better Auth from the frontend
 * For now, we'll use a simple API key approach that can be upgraded later
 */

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Validate API key or session token
 * This is a placeholder - should be replaced with actual Better Auth integration
 */
async function validateAuth(authHeader: string | undefined): Promise<AuthUser | null> {
  if (!authHeader) {
    return null;
  }

  // Check for Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // TODO: Validate token with Better Auth
    // For now, accept any token as valid (development only)
    if (token && token.length > 0) {
      return {
        id: 'user-id',
        email: 'user@example.com',
        role: 'user',
      };
    }
  }

  // Check for API key
  const apiKey = process.env.API_KEY;
  if (apiKey && authHeader === `ApiKey ${apiKey}`) {
    return {
      id: 'api-user',
      email: 'api@system.com',
      role: 'admin',
    };
  }

  return null;
}

/**
 * Authentication middleware
 * Validates requests and attaches user to context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  // Allow public health check
  if (c.req.path === '/api/health') {
    await next();
    return;
  }

  const user = await validateAuth(authHeader);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Attach user to context for use in route handlers
  c.set('user', user);

  await next();
}

/**
 * Require admin role
 */
export async function requireAdmin(c: Context, next: Next) {
  const user = c.get('user') as AuthUser | undefined;

  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  await next();
}

/**
 * Optional auth - doesn't fail if no auth provided
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const user = await validateAuth(authHeader);

  if (user) {
    c.set('user', user);
  }

  await next();
}
