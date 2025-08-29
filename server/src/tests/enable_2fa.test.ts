import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type Enable2FAInput, type CreateUserInput } from '../schema';
import { enable2FA } from '../handlers/enable_2fa';
import { eq } from 'drizzle-orm';
// Helper function to create a test user
const createTestUser = async (userData: CreateUserInput) => {
  const result = await db.insert(usersTable)
    .values({
      email: userData.email,
      password_hash: 'hashed_' + userData.password, // Simple mock hash
      first_name: userData.first_name,
      last_name: userData.last_name,
      two_factor_enabled: false,
      two_factor_secret: null
    })
    .returning()
    .execute();

  return result[0];
};

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User'
};

const testSecret = 'JBSWY3DPEHPK3PXP';

describe('enable2FA', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should enable 2FA for a user', async () => {
    // Create a test user
    const user = await createTestUser(testUser);

    const input: Enable2FAInput = {
      user_id: user.id,
      secret: testSecret
    };

    const result = await enable2FA(input);

    // Verify response structure
    expect(result.success).toBe(true);
    expect(result.backup_codes).toBeInstanceOf(Array);
    expect(result.backup_codes).toHaveLength(10);
    
    // Verify backup codes format (8 character hex strings)
    result.backup_codes.forEach(code => {
      expect(code).toMatch(/^[A-F0-9]{8}$/);
    });
  });

  it('should update user 2FA settings in database', async () => {
    // Create a test user
    const user = await createTestUser(testUser);

    const input: Enable2FAInput = {
      user_id: user.id,
      secret: testSecret
    };

    await enable2FA(input);

    // Verify database was updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    const updatedUser = updatedUsers[0];
    
    expect(updatedUser.two_factor_enabled).toBe(true);
    expect(updatedUser.two_factor_secret).toBe(testSecret);
    expect(updatedUser.updated_at).toBeInstanceOf(Date);
    expect(updatedUser.updated_at > user.updated_at).toBe(true);
  });

  it('should generate unique backup codes each time', async () => {
    // Create a test user
    const user = await createTestUser(testUser);

    const input: Enable2FAInput = {
      user_id: user.id,
      secret: testSecret
    };

    // Enable 2FA twice and compare backup codes
    const result1 = await enable2FA(input);
    
    // Re-enable 2FA (simulating regeneration)
    const result2 = await enable2FA(input);

    // Backup codes should be different
    expect(result1.backup_codes).not.toEqual(result2.backup_codes);
    
    // But both should have the same structure
    expect(result1.backup_codes).toHaveLength(10);
    expect(result2.backup_codes).toHaveLength(10);
  });

  it('should throw error for non-existent user', async () => {
    const input: Enable2FAInput = {
      user_id: 99999, // Non-existent user ID
      secret: testSecret
    };

    await expect(enable2FA(input)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should handle user with existing 2FA enabled', async () => {
    // Create a test user with 2FA already enabled
    const user = await createTestUser(testUser);
    
    // First enable 2FA
    const firstInput: Enable2FAInput = {
      user_id: user.id,
      secret: 'OLDSECRET123'
    };
    
    await enable2FA(firstInput);

    // Now enable with a new secret
    const newInput: Enable2FAInput = {
      user_id: user.id,
      secret: testSecret
    };

    const result = await enable2FA(newInput);

    expect(result.success).toBe(true);
    expect(result.backup_codes).toHaveLength(10);

    // Verify the secret was updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers[0].two_factor_secret).toBe(testSecret);
    expect(updatedUsers[0].two_factor_enabled).toBe(true);
  });

  it('should preserve other user data when enabling 2FA', async () => {
    // Create a test user
    const user = await createTestUser(testUser);

    const input: Enable2FAInput = {
      user_id: user.id,
      secret: testSecret
    };

    await enable2FA(input);

    // Verify other user data remains unchanged
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    const updatedUser = updatedUsers[0];
    
    expect(updatedUser.email).toBe(user.email);
    expect(updatedUser.password_hash).toBe(user.password_hash);
    expect(updatedUser.first_name).toBe(user.first_name);
    expect(updatedUser.last_name).toBe(user.last_name);
    expect(updatedUser.created_at).toEqual(user.created_at);
  });
});