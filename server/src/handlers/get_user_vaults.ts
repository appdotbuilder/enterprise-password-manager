import { db } from '../db';
import { vaultsTable, vaultSharingTable } from '../db/schema';
import { type Vault } from '../schema';
import { eq, or } from 'drizzle-orm';

export const getUserVaults = async (userId: number): Promise<Vault[]> => {
  try {
    // Query to get both owned vaults and shared vaults
    // We need to join with vault_sharing to get shared vaults
    const ownedVaultsQuery = db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.owner_id, userId));

    const sharedVaultsQuery = db.select({
      id: vaultsTable.id,
      name: vaultsTable.name,
      description: vaultsTable.description,
      owner_id: vaultsTable.owner_id,
      encryption_key: vaultsTable.encryption_key,
      created_at: vaultsTable.created_at,
      updated_at: vaultsTable.updated_at
    })
      .from(vaultsTable)
      .innerJoin(vaultSharingTable, eq(vaultSharingTable.vault_id, vaultsTable.id))
      .where(eq(vaultSharingTable.shared_with_user_id, userId));

    // Execute both queries
    const [ownedVaults, sharedVaultResults] = await Promise.all([
      ownedVaultsQuery.execute(),
      sharedVaultsQuery.execute()
    ]);

    // Extract shared vaults from joined results
    const sharedVaults = sharedVaultResults.map(result => ({
      id: result.id,
      name: result.name,
      description: result.description,
      owner_id: result.owner_id,
      encryption_key: result.encryption_key,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));

    // Combine and deduplicate results (in case user owns a vault that's also shared with them)
    const allVaults = [...ownedVaults, ...sharedVaults];
    const uniqueVaults = allVaults.filter((vault, index, self) =>
      index === self.findIndex(v => v.id === vault.id)
    );

    return uniqueVaults;
  } catch (error) {
    console.error('Failed to get user vaults:', error);
    throw error;
  }
};