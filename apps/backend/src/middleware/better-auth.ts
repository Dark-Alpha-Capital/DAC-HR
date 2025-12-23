import { Context, Next } from 'hono';

/**
 * Better Auth integration middleware
 *
 * This validates session tokens from the frontend's Better Auth implementation
 */

export interface BetterAuthUser {
  id: string;
  name?: string;
  email: string;
  role?: string;
  emailVerified: boolean;
}

/**
 * Validate Better Auth session token
 *
 * Better Auth uses cookies by default, but we'll support both cookies and Bearer tokens
 */
async function validateBetterAuthSession(
  token: string | undefined
): Promise<BetterAuthUser | null> {
  if (!token) {
    return null;
  }

  try {
    // In a real implementation, you would:
    // 1. Decode the JWT token
    // 2. Verify signature
    // 3. Check expiration
    // 4. Query database for user info if needed

    // For now, we'll use a simple approach that accepts any valid-looking token
    // This should be replaced with actual Better Auth session validation

    // Better Auth tokens are typically JWTs
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null; // Not a valid JWT format
    }

    // Decode the payload (middle part)
    const payload = JSON.parse(atob(parts[1]));

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null; // Token expired
    }

    // Return user info from token
    return {
      id: payload.sub || payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role || 'user',
      emailVerified: payload.emailVerified || false,
    };
  } catch (error) {
    console.error('Error validating Better Auth session:', error);
    return null;
  }
}

/**
 * Better Auth middleware
 * Validates sessions and attaches user to context
 */
export async function betterAuthMiddleware(c: Context, next: Next) {
  // Skip auth for health check
  if (c.req.path === '/api/health' || c.req.path === '/') {
    await next();
    return;
  }

  let token: string | undefined;

  // Try to get token from Authorization header
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Try to get token from cookie as fallback
  if (!token) {
    const cookieHeader = c.req.header('Cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const sessionCookie = cookies.find(c => c.startsWith('better-auth.session_token='));
      if (sessionCookie) {
        token = sessionCookie.split('=')[1];
      }
    }
  }

  const user = await validateBetterAuthSession(token);

  if (!user) {
    return c.json({ error: 'Unauthorized - Please log in' }, 401);
  }

  // Attach user to context
  c.set('user', user);

  await next();
}

/**
 * Require admin role (for Better Auth)
 */
export async function requireBetterAuthAdmin(c: Context, next: Next) {
  const user = c.get('user') as BetterAuthUser | undefined;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Check if user email ends with @darkalphacapital.com (admin logic from frontend)
  const isAdmin = user.email.endsWith('@darkalphacapital.com') || user.role === 'admin';

  if (!isAdmin) {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  await next();
}

/**
 * Optional Better Auth - doesn't fail if not authenticated
 */
export async function optionalBetterAuth(c: Context, next: Next) {
  let token: string | undefined;

  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (token) {
    const user = await validateBetterAuthSession(token);
    if (user) {
      c.set('user', user);
    }
  }

  await next();
}
