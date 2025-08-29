import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vaultsTable, categoriesTable, passwordEntriesTable, secureNotesTable, creditCardsTable } from '../db/schema';
import { type SearchInput } from '../schema';
import { searchItems } from '../handlers/search_items';

describe('searchItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testVaultId: number;
  let testVault2Id: number;
  let testCategoryId: number;
  let testCategory2Id: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    testUserId = users[0].id;

    // Create test vaults
    const vaults = await db.insert(vaultsTable)
      .values([
        {
          name: 'Test Vault',
          description: 'Test vault description',
          owner_id: testUserId,
          encryption_key: 'test_key_1'
        },
        {
          name: 'Second Vault',
          description: 'Second test vault',
          owner_id: testUserId,
          encryption_key: 'test_key_2'
        }
      ])
      .returning()
      .execute();
    testVaultId = vaults[0].id;
    testVault2Id = vaults[1].id;

    // Create test categories
    const categories = await db.insert(categoriesTable)
      .values([
        {
          name: 'Work',
          vault_id: testVaultId
        },
        {
          name: 'Personal',
          vault_id: testVaultId
        }
      ])
      .returning()
      .execute();
    testCategoryId = categories[0].id;
    testCategory2Id = categories[1].id;

    // Create test data
    await db.insert(passwordEntriesTable)
      .values([
        {
          title: 'GitHub Login',
          username: 'testuser@github.com',
          encrypted_password: 'encrypted_password_1',
          url: 'https://github.com/login',
          notes: 'Work account for development',
          vault_id: testVaultId,
          category_id: testCategoryId,
          created_by: testUserId
        },
        {
          title: 'Gmail Account',
          username: 'personal@gmail.com',
          encrypted_password: 'encrypted_password_2',
          url: 'https://gmail.com',
          notes: 'Personal email account',
          vault_id: testVaultId,
          category_id: testCategory2Id,
          created_by: testUserId
        },
        {
          title: 'Banking Portal',
          username: 'john.doe',
          encrypted_password: 'encrypted_password_3',
          url: 'https://bank.com',
          notes: 'Main banking account',
          vault_id: testVault2Id,
          category_id: null,
          created_by: testUserId
        }
      ])
      .execute();

    await db.insert(secureNotesTable)
      .values([
        {
          title: 'WiFi Password',
          encrypted_content: 'encrypted_wifi_info',
          vault_id: testVaultId,
          category_id: testCategoryId,
          created_by: testUserId
        },
        {
          title: 'Server Configuration',
          encrypted_content: 'encrypted_server_config',
          vault_id: testVaultId,
          category_id: testCategory2Id,
          created_by: testUserId
        }
      ])
      .execute();

    await db.insert(creditCardsTable)
      .values([
        {
          title: 'Visa Card',
          cardholder_name: 'John Doe',
          encrypted_card_number: 'encrypted_card_1',
          encrypted_cvv: 'encrypted_cvv_1',
          expiry_month: 12,
          expiry_year: 2025,
          vault_id: testVaultId,
          category_id: testCategoryId,
          created_by: testUserId
        },
        {
          title: 'Business Credit Card',
          cardholder_name: 'John Doe Business',
          encrypted_card_number: 'encrypted_card_2',
          encrypted_cvv: 'encrypted_cvv_2',
          expiry_month: 6,
          expiry_year: 2026,
          vault_id: testVault2Id,
          category_id: null,
          created_by: testUserId
        }
      ])
      .execute();
  });

  describe('basic search functionality', () => {
    it('should search across all item types when no type filter is specified', async () => {
      const input: SearchInput = {
        query: 'john'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].username).toBe('john.doe');
      expect(results.secureNotes).toHaveLength(0);
      expect(results.creditCards).toHaveLength(2);
      expect(results.creditCards.some(card => card.cardholder_name === 'John Doe')).toBe(true);
      expect(results.creditCards.some(card => card.cardholder_name === 'John Doe Business')).toBe(true);
    });

    it('should search password entries by title', async () => {
      const input: SearchInput = {
        query: 'github'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].title).toBe('GitHub Login');
      expect(results.secureNotes).toHaveLength(0);
      expect(results.creditCards).toHaveLength(0);
    });

    it('should search password entries by username', async () => {
      const input: SearchInput = {
        query: 'personal@gmail.com'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].title).toBe('Gmail Account');
      expect(results.passwordEntries[0].username).toBe('personal@gmail.com');
    });

    it('should search password entries by URL', async () => {
      const input: SearchInput = {
        query: 'bank.com'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].title).toBe('Banking Portal');
      expect(results.passwordEntries[0].url).toBe('https://bank.com');
    });

    it('should search password entries by notes', async () => {
      const input: SearchInput = {
        query: 'development'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].title).toBe('GitHub Login');
      expect(results.passwordEntries[0].notes).toContain('development');
    });

    it('should search secure notes by title', async () => {
      const input: SearchInput = {
        query: 'wifi'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(0);
      expect(results.secureNotes).toHaveLength(1);
      expect(results.secureNotes[0].title).toBe('WiFi Password');
      expect(results.creditCards).toHaveLength(0);
    });

    it('should search credit cards by title', async () => {
      const input: SearchInput = {
        query: 'visa'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(0);
      expect(results.secureNotes).toHaveLength(0);
      expect(results.creditCards).toHaveLength(1);
      expect(results.creditCards[0].title).toBe('Visa Card');
    });

    it('should search credit cards by cardholder name', async () => {
      const input: SearchInput = {
        query: 'business'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(0);
      expect(results.secureNotes).toHaveLength(0);
      expect(results.creditCards).toHaveLength(1);
      expect(results.creditCards[0].title).toBe('Business Credit Card');
    });

    it('should perform case-insensitive search', async () => {
      const input: SearchInput = {
        query: 'GITHUB'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].title).toBe('GitHub Login');
    });

    it('should return empty results when no matches found', async () => {
      const input: SearchInput = {
        query: 'nonexistent'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(0);
      expect(results.secureNotes).toHaveLength(0);
      expect(results.creditCards).toHaveLength(0);
    });
  });

  describe('filtering functionality', () => {
    it('should filter by vault_id', async () => {
      const input: SearchInput = {
        query: 'john',
        vault_id: testVaultId
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(0); // john.doe is in vault2
      expect(results.creditCards).toHaveLength(1);
      expect(results.creditCards[0].cardholder_name).toBe('John Doe');
    });

    it('should filter by category_id', async () => {
      const input: SearchInput = {
        query: 'account',
        category_id: testCategory2Id
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].title).toBe('Gmail Account');
    });

    it('should filter by type - password only', async () => {
      const input: SearchInput = {
        query: 'john',
        type: 'password'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].username).toBe('john.doe');
      expect(results.secureNotes).toHaveLength(0);
      expect(results.creditCards).toHaveLength(0);
    });

    it('should filter by type - note only', async () => {
      const input: SearchInput = {
        query: 'server',
        type: 'note'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(0);
      expect(results.secureNotes).toHaveLength(1);
      expect(results.secureNotes[0].title).toBe('Server Configuration');
      expect(results.creditCards).toHaveLength(0);
    });

    it('should filter by type - credit_card only', async () => {
      const input: SearchInput = {
        query: 'john',
        type: 'credit_card'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(0);
      expect(results.secureNotes).toHaveLength(0);
      expect(results.creditCards).toHaveLength(2);
    });

    it('should combine vault_id and category_id filters', async () => {
      const input: SearchInput = {
        query: 'password',
        vault_id: testVaultId,
        category_id: testCategoryId
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(0); // No password entries match "password" in title/username/url/notes
      expect(results.secureNotes).toHaveLength(1);
      expect(results.secureNotes[0].title).toBe('WiFi Password');
      expect(results.creditCards).toHaveLength(0);
    });

    it('should combine all filters', async () => {
      const input: SearchInput = {
        query: 'visa',
        vault_id: testVaultId,
        category_id: testCategoryId,
        type: 'credit_card'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(0);
      expect(results.secureNotes).toHaveLength(0);
      expect(results.creditCards).toHaveLength(1);
      expect(results.creditCards[0].title).toBe('Visa Card');
    });
  });

  describe('partial matching', () => {
    it('should find partial matches in titles', async () => {
      const input: SearchInput = {
        query: 'git'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].title).toBe('GitHub Login');
    });

    it('should find partial matches in usernames', async () => {
      const input: SearchInput = {
        query: 'testuser'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].username).toBe('testuser@github.com');
    });

    it('should find partial matches in URLs', async () => {
      const input: SearchInput = {
        query: 'gmail'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].url).toBe('https://gmail.com');
    });
  });

  describe('edge cases', () => {
    it('should handle empty query string', async () => {
      const input: SearchInput = {
        query: ''
      };

      const results = await searchItems(input);

      // Should return all items when query is empty
      expect(results.passwordEntries).toHaveLength(3);
      expect(results.secureNotes).toHaveLength(2);
      expect(results.creditCards).toHaveLength(2);
    });

    it('should handle special characters in query', async () => {
      const input: SearchInput = {
        query: '@gmail.com'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].username).toBe('personal@gmail.com');
    });

    it('should handle items with null category_id when filtering by category', async () => {
      const input: SearchInput = {
        query: 'banking',
        category_id: testCategoryId
      };

      const results = await searchItems(input);

      // Should not return items with null category_id
      expect(results.passwordEntries).toHaveLength(0);
      expect(results.secureNotes).toHaveLength(0);
      expect(results.creditCards).toHaveLength(0);
    });

    it('should find items with null values in searchable fields', async () => {
      // Create entry with null username, url, notes
      await db.insert(passwordEntriesTable)
        .values({
          title: 'Minimal Entry',
          username: null,
          encrypted_password: 'encrypted_password',
          url: null,
          notes: null,
          vault_id: testVaultId,
          category_id: testCategoryId,
          created_by: testUserId
        })
        .execute();

      const input: SearchInput = {
        query: 'minimal'
      };

      const results = await searchItems(input);

      expect(results.passwordEntries).toHaveLength(1);
      expect(results.passwordEntries[0].title).toBe('Minimal Entry');
    });
  });
});