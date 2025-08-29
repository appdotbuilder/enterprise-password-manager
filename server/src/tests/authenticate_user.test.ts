import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { authenticateUser } from '../handlers/authenticate_user';
import { createHash } from 'crypto';

// Helper function to hash passwords - matches handler implementation
const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

// Helper to generate 2FA token - matches handler implementation
const generate2FAToken = (secret: string): string => {
  return createHash('sha256').update(secret + Math.floor(Date.now() / 30000)).digest('hex').slice(0, 6);
};

// Test user data
const testPassword = 'testpassword123';
const testPasswordHash = hashPassword(testPassword);
const test2FASecret = 'test-secret-key-for-2fa';

const testUser = {
  email: 'test@example.com',
  password_hash: testPasswordHash,
  first_name: 'Test',
  last_name: 'User',
  two_factor_enabled: false,
  two_factor_secret: null
};

const testUser2FA = {
  email: 'test2fa@example.com',
  password_hash: testPasswordHash,
  first_name: 'Test2FA',
  last_name: 'User',
  two_factor_enabled: true,
  two_factor_secret: test2FASecret
};

describe('authenticateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: testPassword
    };

    const result = await authenticateUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.first_name).toEqual('Test');
    expect(result!.last_name).toEqual('User');
    expect(result!.two_factor_enabled).toEqual(false);
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: testPassword
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should authenticate user with valid 2FA token', async () => {
    // Create test user with 2FA enabled
    await db.insert(usersTable).values(testUser2FA).execute();

    // Generate valid 2FA token
    const validToken = generate2FAToken(test2FASecret);

    const loginInput: LoginInput = {
      email: 'test2fa@example.com',
      password: testPassword,
      two_factor_token: validToken
    };

    const result = await authenticateUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test2fa@example.com');
    expect(result!.first_name).toEqual('Test2FA');
    expect(result!.two_factor_enabled).toEqual(true);
    expect(result!.two_factor_secret).toEqual(test2FASecret);
  });

  it('should return null when 2FA is enabled but no token provided', async () => {
    // Create test user with 2FA enabled
    await db.insert(usersTable).values(testUser2FA).execute();

    const loginInput: LoginInput = {
      email: 'test2fa@example.com',
      password: testPassword
      // No 2FA token provided
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for invalid 2FA token', async () => {
    // Create test user with 2FA enabled
    await db.insert(usersTable).values(testUser2FA).execute();

    const loginInput: LoginInput = {
      email: 'test2fa@example.com',
      password: testPassword,
      two_factor_token: '000000' // Invalid token
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return null when 2FA enabled but no secret stored', async () => {
    // Create test user with 2FA enabled but no secret
    const inconsistentUser = {
      ...testUser2FA,
      email: 'inconsistent@example.com',
      two_factor_secret: null // Inconsistent state: 2FA enabled but no secret
    };

    await db.insert(usersTable).values(inconsistentUser).execute();

    const loginInput: LoginInput = {
      email: 'inconsistent@example.com',
      password: testPassword,
      two_factor_token: '123456'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should handle case-sensitive email matching', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const loginInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM', // Different case
      password: testPassword
    };

    const result = await authenticateUser(loginInput);

    // Should return null as email is case-sensitive
    expect(result).toBeNull();
  });

  it('should include all user fields in successful authentication', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = users[0];

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: testPassword
    };

    const result = await authenticateUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual(createdUser.email);
    expect(result!.password_hash).toEqual(createdUser.password_hash);
    expect(result!.first_name).toEqual(createdUser.first_name);
    expect(result!.last_name).toEqual(createdUser.last_name);
    expect(result!.two_factor_enabled).toEqual(createdUser.two_factor_enabled);
    expect(result!.two_factor_secret).toEqual(createdUser.two_factor_secret);
    expect(result!.created_at).toEqual(createdUser.created_at);
    expect(result!.updated_at).toEqual(createdUser.updated_at);
  });

  it('should handle empty password gracefully', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: '' // Empty password
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should handle malformed 2FA token gracefully', async () => {
    // Create test user with 2FA enabled
    await db.insert(usersTable).values(testUser2FA).execute();

    const loginInput: LoginInput = {
      email: 'test2fa@example.com',
      password: testPassword,
      two_factor_token: 'invalid-format-token-too-long'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });
});