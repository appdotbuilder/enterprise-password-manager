import { db } from '../db';
import { passwordEntriesTable, secureNotesTable, creditCardsTable } from '../db/schema';
import { type PasswordEntry, type SecureNote, type CreditCard } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export interface VaultItems {
    passwordEntries: PasswordEntry[];
    secureNotes: SecureNote[];
    creditCards: CreditCard[];
}

export const getVaultItems = async (vaultId: number, categoryId?: number): Promise<VaultItems> => {
    try {
        // Build conditions for filtering
        const conditions: SQL<unknown>[] = [eq(passwordEntriesTable.vault_id, vaultId)];
        const noteConditions: SQL<unknown>[] = [eq(secureNotesTable.vault_id, vaultId)];
        const cardConditions: SQL<unknown>[] = [eq(creditCardsTable.vault_id, vaultId)];

        // Add category filter if provided
        if (categoryId !== undefined) {
            conditions.push(eq(passwordEntriesTable.category_id, categoryId));
            noteConditions.push(eq(secureNotesTable.category_id, categoryId));
            cardConditions.push(eq(creditCardsTable.category_id, categoryId));
        }

        // Execute all queries in parallel
        const [passwordEntries, secureNotes, creditCards] = await Promise.all([
            db.select()
                .from(passwordEntriesTable)
                .where(and(...conditions))
                .execute(),
            
            db.select()
                .from(secureNotesTable)
                .where(and(...noteConditions))
                .execute(),
            
            db.select()
                .from(creditCardsTable)
                .where(and(...cardConditions))
                .execute()
        ]);

        return {
            passwordEntries,
            secureNotes,
            creditCards
        };
    } catch (error) {
        console.error('Failed to get vault items:', error);
        throw error;
    }
};