import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vaultsTable, categoriesTable, passwordEntriesTable, vaultSharingTable } from '../db/schema';
import { type CreatePasswordEntryInput } from '../schema';
import { createPasswordEntry } from '../handlers/create_password_entry';
import { eq } from 'drizzle-orm';

describe('createPasswordEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestUser = async (email = 'test@example.com') => {
    const users = await db.insert(usersTable)
      .values({
        email,
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    return users[0];
  };

  const createTestVault = async (ownerId: number, name = 'Test Vault') => {
    const vaults = await db.insert(vaultsTable)
      .values({
        name,
        description: 'A test vault',
        owner_id: ownerId,
        encryption_key: 'test_encryption_key_123'
      })
      .returning()
      .execute();
    return vaults[0];
  };

  const createTestCategory = async (vaultId: number, name = 'Test Category') => {
    const categories = await db.insert(categoriesTable)
      .values({
        name,
        vault_id: vaultId
      })
      .returning()
      .execute();
    return categories[0];
  };

  const baseInput: Omit<CreatePasswordEntryInput, 'vault_id' | 'created_by'> = {
    title: 'Gmail Account',
    username: 'user@gmail.com',
    password: 'super_secret_password',
    url: 'https://gmail.com',
    notes: 'My main email account'
  };

  it('should create a password entry successfully', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);
    const testCategory = await createTestCategory(testVault.id);

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: testVault.id,
      category_id: testCategory.id,
      created_by: testUser.id
    };

    const result = await createPasswordEntry(input);

    // Verify returned data
    expect(result.title).toEqual('Gmail Account');
    expect(result.username).toEqual('user@gmail.com');
    expect(result.encrypted_password).toBeDefined();
    expect(result.encrypted_password).not.toEqual(input.password); // Should be encrypted
    expect(result.url).toEqual('https://gmail.com');
    expect(result.notes).toEqual('My main email account');
    expect(result.vault_id).toEqual(testVault.id);
    expect(result.category_id).toEqual(testCategory.id);
    expect(result.created_by).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save password entry to database', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);
    const testCategory = await createTestCategory(testVault.id);

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: testVault.id,
      category_id: testCategory.id,
      created_by: testUser.id
    };

    const result = await createPasswordEntry(input);

    // Query database to verify entry was saved
    const entries = await db.select()
      .from(passwordEntriesTable)
      .where(eq(passwordEntriesTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toEqual('Gmail Account');
    expect(entries[0].username).toEqual('user@gmail.com');
    expect(entries[0].encrypted_password).toBeDefined();
    expect(entries[0].vault_id).toEqual(testVault.id);
    expect(entries[0].category_id).toEqual(testCategory.id);
    expect(entries[0].created_by).toEqual(testUser.id);
  });

  it('should create password entry without optional fields', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);

    const input: CreatePasswordEntryInput = {
      title: 'Simple Entry',
      password: 'simple_password',
      vault_id: testVault.id,
      created_by: testUser.id
    };

    const result = await createPasswordEntry(input);

    expect(result.title).toEqual('Simple Entry');
    expect(result.username).toBeNull();
    expect(result.url).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.category_id).toBeNull();
    expect(result.encrypted_password).toBeDefined();
  });

  it('should encrypt password using vault encryption key', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);

    const input: CreatePasswordEntryInput = {
      title: 'Test Entry',
      password: 'test_password_123',
      vault_id: testVault.id,
      created_by: testUser.id
    };

    const result1 = await createPasswordEntry(input);
    
    // Create same password entry again
    const result2 = await createPasswordEntry({
      ...input,
      title: 'Another Entry'
    });

    // Both should have same encrypted password (using same vault key and password)
    expect(result1.encrypted_password).toEqual(result2.encrypted_password);
    expect(result1.encrypted_password).not.toEqual(input.password);
  });

  it('should allow vault owner to create password entries', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: testVault.id,
      created_by: testUser.id // testUser is the vault owner
    };

    const result = await createPasswordEntry(input);

    expect(result.created_by).toEqual(testUser.id);
    expect(result.vault_id).toEqual(testVault.id);
  });

  it('should allow users with write permission to create password entries', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);
    const anotherUser = await createTestUser('another@example.com');

    // Share vault with another user with write permission
    await db.insert(vaultSharingTable)
      .values({
        vault_id: testVault.id,
        shared_with_user_id: anotherUser.id,
        shared_by_user_id: testUser.id,
        permission_level: 'write'
      })
      .execute();

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: testVault.id,
      created_by: anotherUser.id
    };

    const result = await createPasswordEntry(input);

    expect(result.created_by).toEqual(anotherUser.id);
  });

  it('should allow users with admin permission to create password entries', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);
    const anotherUser = await createTestUser('another@example.com');

    // Share vault with another user with admin permission
    await db.insert(vaultSharingTable)
      .values({
        vault_id: testVault.id,
        shared_with_user_id: anotherUser.id,
        shared_by_user_id: testUser.id,
        permission_level: 'admin'
      })
      .execute();

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: testVault.id,
      created_by: anotherUser.id
    };

    const result = await createPasswordEntry(input);

    expect(result.created_by).toEqual(anotherUser.id);
  });

  it('should throw error when vault does not exist', async () => {
    const testUser = await createTestUser();

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: 99999, // Non-existent vault
      created_by: testUser.id
    };

    await expect(createPasswordEntry(input)).rejects.toThrow(/vault not found/i);
  });

  it('should throw error when user has no access to vault', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);
    const anotherUser = await createTestUser('another@example.com');

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: testVault.id,
      created_by: anotherUser.id // User without access
    };

    await expect(createPasswordEntry(input)).rejects.toThrow(/insufficient permissions/i);
  });

  it('should throw error when user has only read permission', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);
    const anotherUser = await createTestUser('another@example.com');

    // Share vault with read-only permission
    await db.insert(vaultSharingTable)
      .values({
        vault_id: testVault.id,
        shared_with_user_id: anotherUser.id,
        shared_by_user_id: testUser.id,
        permission_level: 'read'
      })
      .execute();

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: testVault.id,
      created_by: anotherUser.id
    };

    await expect(createPasswordEntry(input)).rejects.toThrow(/insufficient permissions/i);
  });

  it('should throw error when category does not exist', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: testVault.id,
      category_id: 99999, // Non-existent category
      created_by: testUser.id
    };

    await expect(createPasswordEntry(input)).rejects.toThrow(/category not found/i);
  });

  it('should throw error when category belongs to different vault', async () => {
    const testUser = await createTestUser();
    const testVault = await createTestVault(testUser.id);
    const anotherVault = await createTestVault(testUser.id, 'Another Vault');
    const anotherCategory = await createTestCategory(anotherVault.id, 'Another Category');

    const input: CreatePasswordEntryInput = {
      ...baseInput,
      vault_id: testVault.id,
      category_id: anotherCategory.id, // Category from different vault
      created_by: testUser.id
    };

    await expect(createPasswordEntry(input)).rejects.toThrow(/category not found or does not belong/i);
  });
});