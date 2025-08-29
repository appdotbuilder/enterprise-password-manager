import { db } from '../db';
import { passwordEntriesTable, secureNotesTable, creditCardsTable } from '../db/schema';
import { type SearchInput, type PasswordEntry, type SecureNote, type CreditCard } from '../schema';
import { eq, and, ilike, or, isNotNull, type SQL } from 'drizzle-orm';

export interface SearchResults {
    passwordEntries: PasswordEntry[];
    secureNotes: SecureNote[];
    creditCards: CreditCard[];
}

export const searchItems = async (input: SearchInput): Promise<SearchResults> => {
    try {
        const results: SearchResults = {
            passwordEntries: [],
            secureNotes: [],
            creditCards: []
        };

        // If type filter is specified, only search that type
        const shouldSearchPasswords = !input.type || input.type === 'password';
        const shouldSearchNotes = !input.type || input.type === 'note';
        const shouldSearchCards = !input.type || input.type === 'credit_card';

        // Search password entries
        if (shouldSearchPasswords) {
            const passwordConditions: SQL<unknown>[] = [];
            
            // Search conditions - search in title, username, url, notes
            if (input.query.trim() !== '') {
                const searchConditions: SQL<unknown>[] = [
                    ilike(passwordEntriesTable.title, `%${input.query}%`)
                ];

                // Add searches for nullable fields, but only consider non-null values
                searchConditions.push(
                    and(
                        isNotNull(passwordEntriesTable.username),
                        ilike(passwordEntriesTable.username, `%${input.query}%`)
                    )!,
                    and(
                        isNotNull(passwordEntriesTable.url),
                        ilike(passwordEntriesTable.url, `%${input.query}%`)
                    )!,
                    and(
                        isNotNull(passwordEntriesTable.notes),
                        ilike(passwordEntriesTable.notes, `%${input.query}%`)
                    )!
                );

                passwordConditions.push(or(...searchConditions)!);
            }

            // Apply filters
            if (input.vault_id !== undefined) {
                passwordConditions.push(eq(passwordEntriesTable.vault_id, input.vault_id));
            }

            if (input.category_id !== undefined) {
                passwordConditions.push(eq(passwordEntriesTable.category_id, input.category_id));
            }

            // Execute query with conditions
            if (passwordConditions.length > 0) {
                results.passwordEntries = await db.select()
                    .from(passwordEntriesTable)
                    .where(
                        passwordConditions.length === 1 
                            ? passwordConditions[0] 
                            : and(...passwordConditions)!
                    )
                    .execute();
            } else {
                results.passwordEntries = await db.select()
                    .from(passwordEntriesTable)
                    .execute();
            }
        }

        // Search secure notes
        if (shouldSearchNotes) {
            const noteConditions: SQL<unknown>[] = [];
            
            // Search conditions - search in title only (encrypted_content cannot be searched)
            if (input.query.trim() !== '') {
                noteConditions.push(ilike(secureNotesTable.title, `%${input.query}%`));
            }

            // Apply filters
            if (input.vault_id !== undefined) {
                noteConditions.push(eq(secureNotesTable.vault_id, input.vault_id));
            }

            if (input.category_id !== undefined) {
                noteConditions.push(eq(secureNotesTable.category_id, input.category_id));
            }

            // Execute query with conditions
            if (noteConditions.length > 0) {
                results.secureNotes = await db.select()
                    .from(secureNotesTable)
                    .where(
                        noteConditions.length === 1 
                            ? noteConditions[0] 
                            : and(...noteConditions)!
                    )
                    .execute();
            } else {
                results.secureNotes = await db.select()
                    .from(secureNotesTable)
                    .execute();
            }
        }

        // Search credit cards
        if (shouldSearchCards) {
            const cardConditions: SQL<unknown>[] = [];
            
            // Search conditions - search in title and cardholder_name
            if (input.query.trim() !== '') {
                const searchConditions: SQL<unknown>[] = [
                    ilike(creditCardsTable.title, `%${input.query}%`),
                    ilike(creditCardsTable.cardholder_name, `%${input.query}%`)
                ];
                cardConditions.push(or(...searchConditions)!);
            }

            // Apply filters
            if (input.vault_id !== undefined) {
                cardConditions.push(eq(creditCardsTable.vault_id, input.vault_id));
            }

            if (input.category_id !== undefined) {
                cardConditions.push(eq(creditCardsTable.category_id, input.category_id));
            }

            // Execute query with conditions
            if (cardConditions.length > 0) {
                results.creditCards = await db.select()
                    .from(creditCardsTable)
                    .where(
                        cardConditions.length === 1 
                            ? cardConditions[0] 
                            : and(...cardConditions)!
                    )
                    .execute();
            } else {
                results.creditCards = await db.select()
                    .from(creditCardsTable)
                    .execute();
            }
        }

        return results;
    } catch (error) {
        console.error('Search operation failed:', error);
        throw error;
    }
};