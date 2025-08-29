import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vaultsTable, usersTable } from '../db/schema';
import { type CreateVaultInput, type CreateUserInput } from '../schema';
import { createVault } from '../handlers/create_vault';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// Test inputs
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User'
};

const testVaultInput: CreateVaultInput = {
  name: 'Personal Vault',
  description: 'My personal password vault',
  owner_id: 1 // Will be set after creating user
};

const testVaultInputNoDescription: CreateVaultInput = {
  name: 'Work Vault',
  owner_id: 1 // Will be set after creating user
};

describe('createVault', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first since vault requires owner_id
    const passwordHash = createHash('sha256').update(testUserInput.password).digest('hex');
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: passwordHash,
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
    testVaultInput.owner_id = testUserId;
    testVaultInputNoDescription.owner_id = testUserId;
  });

  it('should create a vault with description', async () => {
    const result = await createVault(testVaultInput);

    // Basic field validation
    expect(result.name).toEqual('Personal Vault');
    expect(result.description).toEqual('My personal password vault');
    expect(result.owner_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Encryption key validation
    expect(result.encryption_key).toBeDefined();
    expect(result.encryption_key.length).toEqual(64); // 32 bytes = 64 hex characters
    expect(/^[a-f0-9]+$/i.test(result.encryption_key)).toBe(true); // Should be valid hex
  });

  it('should create a vault without description', async () => {
    const result = await createVault(testVaultInputNoDescription);

    // Basic field validation
    expect(result.name).toEqual('Work Vault');
    expect(result.description).toBeNull();
    expect(result.owner_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Encryption key validation
    expect(result.encryption_key).toBeDefined();
    expect(result.encryption_key.length).toEqual(64);
    expect(/^[a-f0-9]+$/i.test(result.encryption_key)).toBe(true);
  });

  it('should save vault to database', async () => {
    const result = await createVault(testVaultInput);

    // Query using proper drizzle syntax
    const vaults = await db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.id, result.id))
      .execute();

    expect(vaults).toHaveLength(1);
    expect(vaults[0].name).toEqual('Personal Vault');
    expect(vaults[0].description).toEqual('My personal password vault');
    expect(vaults[0].owner_id).toEqual(testUserId);
    expect(vaults[0].encryption_key).toEqual(result.encryption_key);
    expect(vaults[0].created_at).toBeInstanceOf(Date);
    expect(vaults[0].updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique encryption keys', async () => {
    const vault1 = await createVault({
      ...testVaultInput,
      name: 'Vault 1'
    });

    const vault2 = await createVault({
      ...testVaultInput,
      name: 'Vault 2'
    });

    // Each vault should have a different encryption key
    expect(vault1.encryption_key).not.toEqual(vault2.encryption_key);
    expect(vault1.encryption_key.length).toEqual(64);
    expect(vault2.encryption_key.length).toEqual(64);
  });

  it('should fail when owner does not exist', async () => {
    const invalidInput: CreateVaultInput = {
      name: 'Invalid Vault',
      description: 'This should fail',
      owner_id: 99999 // Non-existent user ID
    };

    await expect(createVault(invalidInput))
      .rejects
      .toThrow(/User with id 99999 does not exist/i);
  });

  it('should handle optional description correctly', async () => {
    const inputWithUndefinedDescription: CreateVaultInput = {
      name: 'Test Vault',
      owner_id: testUserId,
      description: undefined
    };

    const result = await createVault(inputWithUndefinedDescription);

    expect(result.name).toEqual('Test Vault');
    expect(result.description).toBeNull();
    expect(result.owner_id).toEqual(testUserId);

    // Verify in database
    const vaults = await db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.id, result.id))
      .execute();

    expect(vaults[0].description).toBeNull();
  });
});