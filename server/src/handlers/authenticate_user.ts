import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, timingSafeEqual } from 'crypto';

// Simple hash function for demonstration - in production use bcrypt
const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

// Simple 2FA token verification - in production use proper TOTP library
const verify2FAToken = (token: string, secret: string): boolean => {
  // For testing purposes, we'll accept a simple hash-based verification
  // In production, use proper TOTP verification with time windows
  const expectedToken = createHash('sha256').update(secret + Math.floor(Date.now() / 30000)).digest('hex').slice(0, 6);
  
  try {
    const tokenBuffer = Buffer.from(token, 'utf8');
    const expectedBuffer = Buffer.from(expectedToken, 'utf8');
    
    if (tokenBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

export const authenticateUser = async (input: LoginInput): Promise<User | null> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // Verify password - simple hash comparison for demonstration
    const inputPasswordHash = hashPassword(input.password);
    if (inputPasswordHash !== user.password_hash) {
      return null; // Invalid password
    }

    // Check 2FA if enabled
    if (user.two_factor_enabled) {
      // 2FA is enabled but no token provided
      if (!input.two_factor_token) {
        return null; // 2FA token required but not provided
      }

      // Verify 2FA token
      if (!user.two_factor_secret) {
        return null; // 2FA enabled but no secret stored (data inconsistency)
      }

      const isTokenValid = verify2FAToken(input.two_factor_token, user.two_factor_secret);
      if (!isTokenValid) {
        return null; // Invalid 2FA token
      }
    }

    // Authentication successful - return user
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      two_factor_enabled: user.two_factor_enabled,
      two_factor_secret: user.two_factor_secret,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User authentication failed:', error);
    throw error;
  }
};