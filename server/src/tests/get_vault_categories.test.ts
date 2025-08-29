import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vaultsTable, categoriesTable } from '../db/schema';
import { getVaultCategories } from '../handlers/get_vault_categories';

describe('getVaultCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for vault with no categories', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create vault
    const [vault] = await db.insert(vaultsTable)
      .values({
        name: 'Test Vault',
        owner_id: user.id,
        encryption_key: 'test-key'
      })
      .returning()
      .execute();

    const result = await getVaultCategories(vault.id);

    expect(result).toHaveLength(0);
  });

  it('should return all categories for a vault', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create vault
    const [vault] = await db.insert(vaultsTable)
      .values({
        name: 'Test Vault',
        owner_id: user.id,
        encryption_key: 'test-key'
      })
      .returning()
      .execute();

    // Create categories
    const [category1] = await db.insert(categoriesTable)
      .values({
        name: 'Personal',
        vault_id: vault.id
      })
      .returning()
      .execute();

    const [category2] = await db.insert(categoriesTable)
      .values({
        name: 'Work',
        vault_id: vault.id
      })
      .returning()
      .execute();

    const result = await getVaultCategories(vault.id);

    expect(result).toHaveLength(2);
    expect(result.find(c => c.name === 'Personal')).toBeDefined();
    expect(result.find(c => c.name === 'Work')).toBeDefined();
    
    // Verify all fields are present
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.vault_id).toEqual(vault.id);
      expect(category.created_at).toBeInstanceOf(Date);
    });
  });

  it('should only return categories for the specified vault', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create two vaults
    const [vault1] = await db.insert(vaultsTable)
      .values({
        name: 'Vault 1',
        owner_id: user.id,
        encryption_key: 'test-key-1'
      })
      .returning()
      .execute();

    const [vault2] = await db.insert(vaultsTable)
      .values({
        name: 'Vault 2',
        owner_id: user.id,
        encryption_key: 'test-key-2'
      })
      .returning()
      .execute();

    // Create categories in both vaults
    await db.insert(categoriesTable)
      .values([
        { name: 'Vault 1 Category', vault_id: vault1.id },
        { name: 'Vault 2 Category', vault_id: vault2.id }
      ])
      .execute();

    const vault1Categories = await getVaultCategories(vault1.id);
    const vault2Categories = await getVaultCategories(vault2.id);

    expect(vault1Categories).toHaveLength(1);
    expect(vault1Categories[0].name).toEqual('Vault 1 Category');
    expect(vault1Categories[0].vault_id).toEqual(vault1.id);

    expect(vault2Categories).toHaveLength(1);
    expect(vault2Categories[0].name).toEqual('Vault 2 Category');
    expect(vault2Categories[0].vault_id).toEqual(vault2.id);
  });

  it('should handle non-existent vault gracefully', async () => {
    const result = await getVaultCategories(999);

    expect(result).toHaveLength(0);
  });

  it('should return categories ordered by creation date', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create vault
    const [vault] = await db.insert(vaultsTable)
      .values({
        name: 'Test Vault',
        owner_id: user.id,
        encryption_key: 'test-key'
      })
      .returning()
      .execute();

    // Create multiple categories
    await db.insert(categoriesTable)
      .values([
        { name: 'First Category', vault_id: vault.id },
        { name: 'Second Category', vault_id: vault.id },
        { name: 'Third Category', vault_id: vault.id }
      ])
      .execute();

    const result = await getVaultCategories(vault.id);

    expect(result).toHaveLength(3);
    
    // Verify all categories belong to the correct vault
    result.forEach(category => {
      expect(category.vault_id).toEqual(vault.id);
      expect(category.created_at).toBeInstanceOf(Date);
    });

    // Verify creation dates are in chronological order or same
    for (let i = 1; i < result.length; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(
        result[i - 1].created_at.getTime()
      );
    }
  });
});