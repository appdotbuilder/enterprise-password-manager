import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'crypto';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vaultsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'testpassword123',
  first_name: 'John',
  last_name: 'Doe'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Verify user fields
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.two_factor_enabled).toEqual(false);
    expect(result.two_factor_secret).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password is hashed (should not match plain text)
    expect(result.password_hash).not.toEqual(testInput.password);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash.length).toBeGreaterThan(0);

    // Verify crypto hash is valid
    const [hash, salt] = result.password_hash.split(':');
    const expectedHash = crypto.pbkdf2Sync(testInput.password, salt, 10000, 64, 'sha512').toString('hex');
    expect(hash).toEqual(expectedHash);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.first_name).toEqual('John');
    expect(savedUser.last_name).toEqual('Doe');
    expect(savedUser.two_factor_enabled).toEqual(false);
    expect(savedUser.two_factor_secret).toBeNull();
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);

    // Verify password hash is properly stored
    const [hash, salt] = savedUser.password_hash.split(':');
    const expectedHash = crypto.pbkdf2Sync(testInput.password, salt, 10000, 64, 'sha512').toString('hex');
    expect(hash).toEqual(expectedHash);
  });

  it('should create default vault for the user', async () => {
    const result = await createUser(testInput);

    // Query default vault from database
    const vaults = await db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.owner_id, result.id))
      .execute();

    expect(vaults).toHaveLength(1);
    const defaultVault = vaults[0];
    expect(defaultVault.name).toEqual("John's Vault");
    expect(defaultVault.description).toEqual('Default vault');
    expect(defaultVault.owner_id).toEqual(result.id);
    expect(defaultVault.encryption_key).toBeDefined();
    expect(defaultVault.encryption_key.length).toEqual(64); // 32 bytes as hex string
    expect(defaultVault.created_at).toBeInstanceOf(Date);
    expect(defaultVault.updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle different user names properly', async () => {
    const userInput: CreateUserInput = {
      email: 'jane.smith@example.com',
      password: 'anotherpassword456',
      first_name: 'Jane',
      last_name: 'Smith'
    };

    const result = await createUser(userInput);

    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');

    // Check that vault name reflects the user's first name
    const vaults = await db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.owner_id, result.id))
      .execute();

    expect(vaults).toHaveLength(1);
    expect(vaults[0].name).toEqual("Jane's Vault");
  });
});