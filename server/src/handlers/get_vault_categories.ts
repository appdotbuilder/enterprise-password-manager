import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const getVaultCategories = async (vaultId: number): Promise<Category[]> => {
  try {
    const results = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.vault_id, vaultId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get vault categories:', error);
    throw error;
  }
};