import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vaultsTable, categoriesTable, creditCardsTable, vaultSharingTable } from '../db/schema';
import { type CreateCreditCardInput } from '../schema';
import { createCreditCard } from '../handlers/create_credit_card';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

describe('createCreditCard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testVault: any;
  let testCategory: any;
  let otherUser: any;
  let otherVault: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: crypto.createHash('sha256').update('password123').digest('hex'),
          first_name: 'Test',
          last_name: 'User'
        },
        {
          email: 'other@example.com',
          password_hash: crypto.createHash('sha256').update('password123').digest('hex'),
          first_name: 'Other',
          last_name: 'User'
        }
      ])
      .returning()
      .execute();

    testUser = users[0];
    otherUser = users[1];

    // Create test vaults
    const vaults = await db.insert(vaultsTable)
      .values([
        {
          name: 'Test Vault',
          owner_id: testUser.id,
          encryption_key: 'test-encryption-key-123'
        },
        {
          name: 'Other Vault',
          owner_id: otherUser.id,
          encryption_key: 'other-encryption-key-456'
        }
      ])
      .returning()
      .execute();

    testVault = vaults[0];
    otherVault = vaults[1];

    // Create test category
    const categories = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        vault_id: testVault.id
      })
      .returning()
      .execute();

    testCategory = categories[0];
  });

  const testInput: CreateCreditCardInput = {
    title: 'My Credit Card',
    cardholder_name: 'John Doe',
    card_number: '4111111111111111',
    cvv: '123',
    expiry_month: 12,
    expiry_year: 2025,
    vault_id: 0, // Will be set dynamically
    category_id: 0, // Will be set dynamically
    created_by: 0 // Will be set dynamically
  };

  it('should create a credit card successfully', async () => {
    const input = {
      ...testInput,
      vault_id: testVault.id,
      category_id: testCategory.id,
      created_by: testUser.id
    };

    const result = await createCreditCard(input);

    expect(result.id).toBeDefined();
    expect(result.title).toEqual('My Credit Card');
    expect(result.cardholder_name).toEqual('John Doe');
    expect(result.encrypted_card_number).toBeDefined();
    expect(result.encrypted_card_number).not.toEqual('4111111111111111'); // Should be encrypted
    expect(result.encrypted_cvv).toBeDefined();
    expect(result.encrypted_cvv).not.toEqual('123'); // Should be encrypted
    expect(result.expiry_month).toEqual(12);
    expect(result.expiry_year).toEqual(2025);
    expect(result.vault_id).toEqual(testVault.id);
    expect(result.category_id).toEqual(testCategory.id);
    expect(result.created_by).toEqual(testUser.id);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create credit card without category', async () => {
    const input = {
      ...testInput,
      vault_id: testVault.id,
      category_id: undefined,
      created_by: testUser.id
    };

    const result = await createCreditCard(input);

    expect(result.category_id).toBeNull();
    expect(result.title).toEqual('My Credit Card');
    expect(result.vault_id).toEqual(testVault.id);
  });

  it('should save credit card to database', async () => {
    const input = {
      ...testInput,
      vault_id: testVault.id,
      category_id: testCategory.id,
      created_by: testUser.id
    };

    const result = await createCreditCard(input);

    const savedCards = await db.select()
      .from(creditCardsTable)
      .where(eq(creditCardsTable.id, result.id))
      .execute();

    expect(savedCards).toHaveLength(1);
    expect(savedCards[0].title).toEqual('My Credit Card');
    expect(savedCards[0].cardholder_name).toEqual('John Doe');
    expect(savedCards[0].encrypted_card_number).not.toEqual('4111111111111111');
    expect(savedCards[0].encrypted_cvv).not.toEqual('123');
    expect(savedCards[0].vault_id).toEqual(testVault.id);
    expect(savedCards[0].created_by).toEqual(testUser.id);
  });

  it('should encrypt card number and CVV differently each time', async () => {
    const input = {
      ...testInput,
      vault_id: testVault.id,
      created_by: testUser.id
    };

    const result1 = await createCreditCard(input);
    const result2 = await createCreditCard({ ...input, title: 'Card 2' });

    // Same data should encrypt differently due to random IV
    expect(result1.encrypted_card_number).not.toEqual(result2.encrypted_card_number);
    expect(result1.encrypted_cvv).not.toEqual(result2.encrypted_cvv);
  });

  it('should allow shared user with write permission to create credit card', async () => {
    // Share vault with other user with write permission
    await db.insert(vaultSharingTable)
      .values({
        vault_id: testVault.id,
        shared_with_user_id: otherUser.id,
        shared_by_user_id: testUser.id,
        permission_level: 'write'
      })
      .execute();

    const input = {
      ...testInput,
      vault_id: testVault.id,
      created_by: otherUser.id
    };

    const result = await createCreditCard(input);

    expect(result.title).toEqual('My Credit Card');
    expect(result.created_by).toEqual(otherUser.id);
    expect(result.vault_id).toEqual(testVault.id);
  });

  it('should allow shared user with admin permission to create credit card', async () => {
    // Share vault with other user with admin permission
    await db.insert(vaultSharingTable)
      .values({
        vault_id: testVault.id,
        shared_with_user_id: otherUser.id,
        shared_by_user_id: testUser.id,
        permission_level: 'admin'
      })
      .execute();

    const input = {
      ...testInput,
      vault_id: testVault.id,
      created_by: otherUser.id
    };

    const result = await createCreditCard(input);

    expect(result.title).toEqual('My Credit Card');
    expect(result.created_by).toEqual(otherUser.id);
  });

  it('should reject creation by user without vault access', async () => {
    const input = {
      ...testInput,
      vault_id: testVault.id,
      created_by: otherUser.id
    };

    expect(createCreditCard(input)).rejects.toThrow(/insufficient permissions/i);
  });

  it('should reject shared user with only read permission', async () => {
    // Share vault with other user with read permission only
    await db.insert(vaultSharingTable)
      .values({
        vault_id: testVault.id,
        shared_with_user_id: otherUser.id,
        shared_by_user_id: testUser.id,
        permission_level: 'read'
      })
      .execute();

    const input = {
      ...testInput,
      vault_id: testVault.id,
      created_by: otherUser.id
    };

    expect(createCreditCard(input)).rejects.toThrow(/insufficient permissions/i);
  });

  it('should reject creation with non-existent user', async () => {
    const input = {
      ...testInput,
      vault_id: testVault.id,
      created_by: 99999
    };

    expect(createCreditCard(input)).rejects.toThrow(/user not found/i);
  });

  it('should reject creation with non-existent vault', async () => {
    const input = {
      ...testInput,
      vault_id: 99999,
      created_by: testUser.id
    };

    expect(createCreditCard(input)).rejects.toThrow(/vault not found/i);
  });

  it('should reject creation with non-existent category', async () => {
    const input = {
      ...testInput,
      vault_id: testVault.id,
      category_id: 99999,
      created_by: testUser.id
    };

    expect(createCreditCard(input)).rejects.toThrow(/category not found/i);
  });

  it('should reject creation with category from different vault', async () => {
    // Create category in other vault
    const otherCategory = await db.insert(categoriesTable)
      .values({
        name: 'Other Category',
        vault_id: otherVault.id
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      vault_id: testVault.id,
      category_id: otherCategory[0].id,
      created_by: testUser.id
    };

    expect(createCreditCard(input)).rejects.toThrow(/category.*does not belong/i);
  });

  it('should handle edge case expiry dates', async () => {
    const input = {
      ...testInput,
      vault_id: testVault.id,
      created_by: testUser.id,
      expiry_month: 1,
      expiry_year: 2030
    };

    const result = await createCreditCard(input);

    expect(result.expiry_month).toEqual(1);
    expect(result.expiry_year).toEqual(2030);
  });

  it('should handle long cardholder names and titles', async () => {
    const input = {
      ...testInput,
      vault_id: testVault.id,
      created_by: testUser.id,
      title: 'My Very Long Credit Card Title That Contains Many Words',
      cardholder_name: 'John Alexander William Doe-Smith Jr.'
    };

    const result = await createCreditCard(input);

    expect(result.title).toEqual('My Very Long Credit Card Title That Contains Many Words');
    expect(result.cardholder_name).toEqual('John Alexander William Doe-Smith Jr.');
  });
});