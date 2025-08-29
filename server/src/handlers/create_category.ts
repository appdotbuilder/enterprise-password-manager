import { db } from '../db';
import { categoriesTable, vaultsTable } from '../db/schema';
import { type CreateCategoryInput, type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
  try {
    // Verify vault exists before creating category
    const vaults = await db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.id, input.vault_id))
      .execute();

    if (vaults.length === 0) {
      throw new Error(`Vault with id ${input.vault_id} not found`);
    }

    // Insert category record
    const result = await db.insert(categoriesTable)
      .values({
        name: input.name,
        vault_id: input.vault_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category creation failed:', error);
    throw error;
  }
};