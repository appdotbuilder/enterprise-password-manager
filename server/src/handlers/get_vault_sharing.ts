import { db } from '../db';
import { vaultSharingTable } from '../db/schema';
import { type VaultSharing } from '../schema';
import { eq } from 'drizzle-orm';

export const getVaultSharing = async (vaultId: number): Promise<VaultSharing[]> => {
  try {
    // Fetch all vault sharing records for the specified vault
    const results = await db.select()
      .from(vaultSharingTable)
      .where(eq(vaultSharingTable.vault_id, vaultId))
      .execute();

    return results;
  } catch (error) {
    console.error('Getting vault sharing failed:', error);
    throw error;
  }
};