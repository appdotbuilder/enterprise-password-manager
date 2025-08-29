import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, vaultsTable, usersTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Doe'
};

const testVault = {
  name: 'Test Vault',
  description: 'A vault for testing',
  encryption_key: 'test_encryption_key'
};

const testCategoryInput: CreateCategoryInput = {
  name: 'Test Category',
  vault_id: 1 // Will be set dynamically in tests
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite vault
    const vaultResult = await db.insert(vaultsTable)
      .values({
        ...testVault,
        owner_id: userId
      })
      .returning()
      .execute();
    const vaultId = vaultResult[0].id;

    // Create category input with valid vault_id
    const input: CreateCategoryInput = {
      name: 'Test Category',
      vault_id: vaultId
    };

    const result = await createCategory(input);

    // Basic field validation
    expect(result.name).toEqual('Test Category');
    expect(result.vault_id).toEqual(vaultId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite vault
    const vaultResult = await db.insert(vaultsTable)
      .values({
        ...testVault,
        owner_id: userId
      })
      .returning()
      .execute();
    const vaultId = vaultResult[0].id;

    // Create category input with valid vault_id
    const input: CreateCategoryInput = {
      name: 'Test Category',
      vault_id: vaultId
    };

    const result = await createCategory(input);

    // Query database to verify category was saved
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Test Category');
    expect(categories[0].vault_id).toEqual(vaultId);
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when vault does not exist', async () => {
    const input: CreateCategoryInput = {
      name: 'Test Category',
      vault_id: 999 // Non-existent vault ID
    };

    await expect(createCategory(input)).rejects.toThrow(/vault with id 999 not found/i);
  });

  it('should create multiple categories in the same vault', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite vault
    const vaultResult = await db.insert(vaultsTable)
      .values({
        ...testVault,
        owner_id: userId
      })
      .returning()
      .execute();
    const vaultId = vaultResult[0].id;

    // Create first category
    const input1: CreateCategoryInput = {
      name: 'Category 1',
      vault_id: vaultId
    };

    // Create second category
    const input2: CreateCategoryInput = {
      name: 'Category 2',
      vault_id: vaultId
    };

    const result1 = await createCategory(input1);
    const result2 = await createCategory(input2);

    // Verify both categories were created
    expect(result1.name).toEqual('Category 1');
    expect(result2.name).toEqual('Category 2');
    expect(result1.vault_id).toEqual(vaultId);
    expect(result2.vault_id).toEqual(vaultId);
    expect(result1.id).not.toEqual(result2.id);

    // Query database to verify both categories exist
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.vault_id, vaultId))
      .execute();

    expect(categories).toHaveLength(2);
  });

  it('should handle categories with same name in different vaults', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create first vault
    const vault1Result = await db.insert(vaultsTable)
      .values({
        ...testVault,
        name: 'Vault 1',
        owner_id: userId
      })
      .returning()
      .execute();
    const vault1Id = vault1Result[0].id;

    // Create second vault
    const vault2Result = await db.insert(vaultsTable)
      .values({
        ...testVault,
        name: 'Vault 2',
        owner_id: userId
      })
      .returning()
      .execute();
    const vault2Id = vault2Result[0].id;

    // Create category with same name in both vaults
    const input1: CreateCategoryInput = {
      name: 'Personal',
      vault_id: vault1Id
    };

    const input2: CreateCategoryInput = {
      name: 'Personal',
      vault_id: vault2Id
    };

    const result1 = await createCategory(input1);
    const result2 = await createCategory(input2);

    // Verify both categories were created successfully
    expect(result1.name).toEqual('Personal');
    expect(result2.name).toEqual('Personal');
    expect(result1.vault_id).toEqual(vault1Id);
    expect(result2.vault_id).toEqual(vault2Id);
    expect(result1.id).not.toEqual(result2.id);
  });
});