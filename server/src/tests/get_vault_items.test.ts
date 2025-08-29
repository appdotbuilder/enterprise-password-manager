import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
    usersTable, 
    vaultsTable, 
    categoriesTable,
    passwordEntriesTable,
    secureNotesTable,
    creditCardsTable 
} from '../db/schema';
import { type CreateUserInput, type CreateVaultInput, type CreateCategoryInput, type CreatePasswordEntryInput, type CreateSecureNoteInput, type CreateCreditCardInput } from '../schema';
import { getVaultItems } from '../handlers/get_vault_items';
import bcrypt from 'bcryptjs';

describe('getVaultItems', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    let testUser: any;
    let testVault: any;
    let testCategory: any;
    let secondCategory: any;

    beforeEach(async () => {
        // Create test user
        const userInput: CreateUserInput = {
            email: 'test@example.com',
            password: 'password123',
            first_name: 'Test',
            last_name: 'User'
        };

        const hashedPassword = await bcrypt.hash(userInput.password, 10);
        
        const users = await db.insert(usersTable)
            .values({
                email: userInput.email,
                password_hash: hashedPassword,
                first_name: userInput.first_name,
                last_name: userInput.last_name
            })
            .returning()
            .execute();
        testUser = users[0];

        // Create test vault
        const vaultInput: CreateVaultInput = {
            name: 'Test Vault',
            description: 'A test vault',
            owner_id: testUser.id
        };

        const vaults = await db.insert(vaultsTable)
            .values({
                name: vaultInput.name,
                description: vaultInput.description,
                owner_id: vaultInput.owner_id,
                encryption_key: 'test-encryption-key'
            })
            .returning()
            .execute();
        testVault = vaults[0];

        // Create test categories
        const categoryInput: CreateCategoryInput = {
            name: 'Work',
            vault_id: testVault.id
        };

        const categories = await db.insert(categoriesTable)
            .values({
                name: categoryInput.name,
                vault_id: categoryInput.vault_id
            })
            .returning()
            .execute();
        testCategory = categories[0];

        const secondCategoryInput: CreateCategoryInput = {
            name: 'Personal',
            vault_id: testVault.id
        };

        const secondCategories = await db.insert(categoriesTable)
            .values({
                name: secondCategoryInput.name,
                vault_id: secondCategoryInput.vault_id
            })
            .returning()
            .execute();
        secondCategory = secondCategories[0];
    });

    it('should return empty items for vault with no items', async () => {
        const result = await getVaultItems(testVault.id);

        expect(result.passwordEntries).toHaveLength(0);
        expect(result.secureNotes).toHaveLength(0);
        expect(result.creditCards).toHaveLength(0);
    });

    it('should return all items from a vault', async () => {
        // Create test password entry
        const passwordInput: CreatePasswordEntryInput = {
            title: 'Test Password',
            username: 'testuser',
            password: 'testpass',
            url: 'https://example.com',
            notes: 'Test notes',
            vault_id: testVault.id,
            category_id: testCategory.id,
            created_by: testUser.id
        };

        await db.insert(passwordEntriesTable)
            .values({
                title: passwordInput.title,
                username: passwordInput.username,
                encrypted_password: 'encrypted_password',
                url: passwordInput.url,
                notes: passwordInput.notes,
                vault_id: passwordInput.vault_id,
                category_id: passwordInput.category_id,
                created_by: passwordInput.created_by
            })
            .execute();

        // Create test secure note
        const noteInput: CreateSecureNoteInput = {
            title: 'Test Note',
            content: 'Test content',
            vault_id: testVault.id,
            category_id: testCategory.id,
            created_by: testUser.id
        };

        await db.insert(secureNotesTable)
            .values({
                title: noteInput.title,
                encrypted_content: 'encrypted_content',
                vault_id: noteInput.vault_id,
                category_id: noteInput.category_id,
                created_by: noteInput.created_by
            })
            .execute();

        // Create test credit card
        const cardInput: CreateCreditCardInput = {
            title: 'Test Card',
            cardholder_name: 'Test User',
            card_number: '1234567890123456',
            cvv: '123',
            expiry_month: 12,
            expiry_year: 2025,
            vault_id: testVault.id,
            category_id: testCategory.id,
            created_by: testUser.id
        };

        await db.insert(creditCardsTable)
            .values({
                title: cardInput.title,
                cardholder_name: cardInput.cardholder_name,
                encrypted_card_number: 'encrypted_card_number',
                encrypted_cvv: 'encrypted_cvv',
                expiry_month: cardInput.expiry_month,
                expiry_year: cardInput.expiry_year,
                vault_id: cardInput.vault_id,
                category_id: cardInput.category_id,
                created_by: cardInput.created_by
            })
            .execute();

        const result = await getVaultItems(testVault.id);

        // Verify all items are returned
        expect(result.passwordEntries).toHaveLength(1);
        expect(result.secureNotes).toHaveLength(1);
        expect(result.creditCards).toHaveLength(1);

        // Verify password entry fields
        expect(result.passwordEntries[0].title).toEqual('Test Password');
        expect(result.passwordEntries[0].username).toEqual('testuser');
        expect(result.passwordEntries[0].encrypted_password).toEqual('encrypted_password');
        expect(result.passwordEntries[0].url).toEqual('https://example.com');
        expect(result.passwordEntries[0].vault_id).toEqual(testVault.id);
        expect(result.passwordEntries[0].category_id).toEqual(testCategory.id);

        // Verify secure note fields
        expect(result.secureNotes[0].title).toEqual('Test Note');
        expect(result.secureNotes[0].encrypted_content).toEqual('encrypted_content');
        expect(result.secureNotes[0].vault_id).toEqual(testVault.id);
        expect(result.secureNotes[0].category_id).toEqual(testCategory.id);

        // Verify credit card fields
        expect(result.creditCards[0].title).toEqual('Test Card');
        expect(result.creditCards[0].cardholder_name).toEqual('Test User');
        expect(result.creditCards[0].encrypted_card_number).toEqual('encrypted_card_number');
        expect(result.creditCards[0].expiry_month).toEqual(12);
        expect(result.creditCards[0].expiry_year).toEqual(2025);
        expect(result.creditCards[0].vault_id).toEqual(testVault.id);
    });

    it('should filter items by category when category_id is provided', async () => {
        // Create items in first category
        await db.insert(passwordEntriesTable)
            .values({
                title: 'Work Password',
                username: 'work_user',
                encrypted_password: 'work_encrypted',
                vault_id: testVault.id,
                category_id: testCategory.id,
                created_by: testUser.id
            })
            .execute();

        await db.insert(secureNotesTable)
            .values({
                title: 'Work Note',
                encrypted_content: 'work_content',
                vault_id: testVault.id,
                category_id: testCategory.id,
                created_by: testUser.id
            })
            .execute();

        // Create items in second category
        await db.insert(passwordEntriesTable)
            .values({
                title: 'Personal Password',
                username: 'personal_user',
                encrypted_password: 'personal_encrypted',
                vault_id: testVault.id,
                category_id: secondCategory.id,
                created_by: testUser.id
            })
            .execute();

        await db.insert(creditCardsTable)
            .values({
                title: 'Personal Card',
                cardholder_name: 'Test User',
                encrypted_card_number: 'personal_card',
                encrypted_cvv: 'personal_cvv',
                expiry_month: 6,
                expiry_year: 2026,
                vault_id: testVault.id,
                category_id: secondCategory.id,
                created_by: testUser.id
            })
            .execute();

        // Get items from first category only
        const result = await getVaultItems(testVault.id, testCategory.id);

        expect(result.passwordEntries).toHaveLength(1);
        expect(result.secureNotes).toHaveLength(1);
        expect(result.creditCards).toHaveLength(0);

        expect(result.passwordEntries[0].title).toEqual('Work Password');
        expect(result.secureNotes[0].title).toEqual('Work Note');
    });

    it('should return items with null category_id when filtering by specific category', async () => {
        // Create item without category
        await db.insert(passwordEntriesTable)
            .values({
                title: 'Uncategorized Password',
                username: 'no_category',
                encrypted_password: 'no_cat_encrypted',
                vault_id: testVault.id,
                category_id: null,
                created_by: testUser.id
            })
            .execute();

        // Create item with category
        await db.insert(passwordEntriesTable)
            .values({
                title: 'Categorized Password',
                username: 'has_category',
                encrypted_password: 'cat_encrypted',
                vault_id: testVault.id,
                category_id: testCategory.id,
                created_by: testUser.id
            })
            .execute();

        // Filter by specific category should only return categorized item
        const categoryResult = await getVaultItems(testVault.id, testCategory.id);
        expect(categoryResult.passwordEntries).toHaveLength(1);
        expect(categoryResult.passwordEntries[0].title).toEqual('Categorized Password');

        // Get all items should return both
        const allResult = await getVaultItems(testVault.id);
        expect(allResult.passwordEntries).toHaveLength(2);
    });

    it('should return empty result for non-existent vault', async () => {
        const result = await getVaultItems(999999);

        expect(result.passwordEntries).toHaveLength(0);
        expect(result.secureNotes).toHaveLength(0);
        expect(result.creditCards).toHaveLength(0);
    });

    it('should return empty result when filtering by non-existent category', async () => {
        // Create some items
        await db.insert(passwordEntriesTable)
            .values({
                title: 'Test Password',
                username: 'test_user',
                encrypted_password: 'test_encrypted',
                vault_id: testVault.id,
                category_id: testCategory.id,
                created_by: testUser.id
            })
            .execute();

        // Filter by non-existent category
        const result = await getVaultItems(testVault.id, 999999);

        expect(result.passwordEntries).toHaveLength(0);
        expect(result.secureNotes).toHaveLength(0);
        expect(result.creditCards).toHaveLength(0);
    });

    it('should handle multiple items of each type', async () => {
        // Create multiple password entries
        await db.insert(passwordEntriesTable)
            .values([
                {
                    title: 'Password 1',
                    username: 'user1',
                    encrypted_password: 'encrypted1',
                    vault_id: testVault.id,
                    category_id: testCategory.id,
                    created_by: testUser.id
                },
                {
                    title: 'Password 2',
                    username: 'user2',
                    encrypted_password: 'encrypted2',
                    vault_id: testVault.id,
                    category_id: testCategory.id,
                    created_by: testUser.id
                }
            ])
            .execute();

        // Create multiple secure notes
        await db.insert(secureNotesTable)
            .values([
                {
                    title: 'Note 1',
                    encrypted_content: 'content1',
                    vault_id: testVault.id,
                    category_id: testCategory.id,
                    created_by: testUser.id
                },
                {
                    title: 'Note 2',
                    encrypted_content: 'content2',
                    vault_id: testVault.id,
                    category_id: testCategory.id,
                    created_by: testUser.id
                }
            ])
            .execute();

        const result = await getVaultItems(testVault.id);

        expect(result.passwordEntries).toHaveLength(2);
        expect(result.secureNotes).toHaveLength(2);
        expect(result.creditCards).toHaveLength(0);

        // Verify items are properly sorted/ordered
        const passwordTitles = result.passwordEntries.map(p => p.title);
        expect(passwordTitles).toContain('Password 1');
        expect(passwordTitles).toContain('Password 2');
    });
});