import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vaultsTable, categoriesTable, secureNotesTable, vaultSharingTable } from '../db/schema';
import { type CreateSecureNoteInput } from '../schema';
import { createSecureNote } from '../handlers/create_secure_note';
import { eq, and } from 'drizzle-orm';


// Test data setup
let testUser: any;
let testVault: any;
let testCategory: any;
let otherUser: any;

const setupTestData = async () => {
  // Create test users
  const users = await db.insert(usersTable)
    .values([
      {
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        first_name: 'Test',
        last_name: 'User'
      },
      {
        email: 'other@example.com',
        password_hash: 'hashed_password_123',
        first_name: 'Other',
        last_name: 'User'
      }
    ])
    .returning()
    .execute();

  testUser = users[0];
  otherUser = users[1];

  // Create test vault
  const vaults = await db.insert(vaultsTable)
    .values({
      name: 'Test Vault',
      description: 'A vault for testing',
      owner_id: testUser.id,
      encryption_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' // 64 char hex key
    })
    .returning()
    .execute();

  testVault = vaults[0];

  // Create test category
  const categories = await db.insert(categoriesTable)
    .values({
      name: 'Test Category',
      vault_id: testVault.id
    })
    .returning()
    .execute();

  testCategory = categories[0];
};

describe('createSecureNote', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });
  afterEach(resetDB);

  const baseTestInput: CreateSecureNoteInput = {
    title: 'Test Secure Note',
    content: 'This is a secret note content',
    vault_id: 0, // Will be set in tests
    category_id: null,
    created_by: 0 // Will be set in tests
  };

  it('should create a secure note successfully', async () => {
    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id,
      category_id: testCategory.id,
      created_by: testUser.id
    };

    const result = await createSecureNote(input);

    // Verify returned data
    expect(result.id).toBeDefined();
    expect(result.title).toEqual('Test Secure Note');
    expect(result.encrypted_content).toBeDefined();
    expect(result.encrypted_content).not.toEqual('This is a secret note content'); // Should be encrypted
    expect(result.vault_id).toEqual(testVault.id);
    expect(result.category_id).toEqual(testCategory.id);
    expect(result.created_by).toEqual(testUser.id);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create secure note without category', async () => {
    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id,
      created_by: testUser.id
    };

    const result = await createSecureNote(input);

    expect(result.category_id).toBeNull();
    expect(result.title).toEqual('Test Secure Note');
    expect(result.vault_id).toEqual(testVault.id);
    expect(result.created_by).toEqual(testUser.id);
  });

  it('should save secure note to database', async () => {
    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id,
      created_by: testUser.id
    };

    const result = await createSecureNote(input);

    // Query database to verify data was saved
    const notes = await db.select()
      .from(secureNotesTable)
      .where(eq(secureNotesTable.id, result.id))
      .execute();

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toEqual('Test Secure Note');
    expect(notes[0].encrypted_content).toBeDefined();
    expect(notes[0].vault_id).toEqual(testVault.id);
    expect(notes[0].created_by).toEqual(testUser.id);
    expect(notes[0].created_at).toBeInstanceOf(Date);
  });

  it('should allow user with write permissions to create secure note', async () => {
    // Share vault with other user with write permission
    await db.insert(vaultSharingTable)
      .values({
        vault_id: testVault.id,
        shared_with_user_id: otherUser.id,
        shared_by_user_id: testUser.id,
        permission_level: 'write'
      })
      .execute();

    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id,
      created_by: otherUser.id
    };

    const result = await createSecureNote(input);

    expect(result.created_by).toEqual(otherUser.id);
    expect(result.vault_id).toEqual(testVault.id);
  });

  it('should allow user with admin permissions to create secure note', async () => {
    // Share vault with other user with admin permission
    await db.insert(vaultSharingTable)
      .values({
        vault_id: testVault.id,
        shared_with_user_id: otherUser.id,
        shared_by_user_id: testUser.id,
        permission_level: 'admin'
      })
      .execute();

    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id,
      created_by: otherUser.id
    };

    const result = await createSecureNote(input);

    expect(result.created_by).toEqual(otherUser.id);
    expect(result.vault_id).toEqual(testVault.id);
  });

  it('should encrypt content properly', async () => {
    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      content: 'Super secret information',
      vault_id: testVault.id,
      created_by: testUser.id
    };

    const result = await createSecureNote(input);

    // Content should be encrypted and contain IV prefix
    expect(result.encrypted_content).not.toEqual('Super secret information');
    expect(result.encrypted_content).toContain(':'); // IV separator
    expect(result.encrypted_content.length).toBeGreaterThan(32); // At least IV + some encrypted content
  });

  it('should throw error for non-existent vault', async () => {
    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: 99999,
      created_by: testUser.id
    };

    await expect(createSecureNote(input)).rejects.toThrow(/vault not found/i);
  });

  it('should throw error for non-existent user', async () => {
    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id,
      created_by: 99999
    };

    await expect(createSecureNote(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for user without write access', async () => {
    // Share vault with read-only permission
    await db.insert(vaultSharingTable)
      .values({
        vault_id: testVault.id,
        shared_with_user_id: otherUser.id,
        shared_by_user_id: testUser.id,
        permission_level: 'read'
      })
      .execute();

    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id,
      created_by: otherUser.id
    };

    await expect(createSecureNote(input)).rejects.toThrow(/does not have write access/i);
  });

  it('should throw error for user with no vault access', async () => {
    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id,
      created_by: otherUser.id
    };

    await expect(createSecureNote(input)).rejects.toThrow(/does not have write access/i);
  });

  it('should throw error for category not belonging to vault', async () => {
    // Create another vault with a category
    const otherVault = await db.insert(vaultsTable)
      .values({
        name: 'Other Vault',
        owner_id: testUser.id,
        encryption_key: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
      })
      .returning()
      .execute();

    const otherCategory = await db.insert(categoriesTable)
      .values({
        name: 'Other Category',
        vault_id: otherVault[0].id
      })
      .returning()
      .execute();

    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id, // Different vault
      category_id: otherCategory[0].id, // Category from different vault
      created_by: testUser.id
    };

    await expect(createSecureNote(input)).rejects.toThrow(/category not found or does not belong/i);
  });

  it('should throw error for non-existent category', async () => {
    const input: CreateSecureNoteInput = {
      ...baseTestInput,
      vault_id: testVault.id,
      category_id: 99999,
      created_by: testUser.id
    };

    await expect(createSecureNote(input)).rejects.toThrow(/category not found or does not belong/i);
  });
});