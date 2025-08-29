import { db } from '../db';
import { vaultSharingTable, vaultsTable, usersTable } from '../db/schema';
import { type ShareVaultInput, type VaultSharing } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export const shareVault = async (input: ShareVaultInput): Promise<VaultSharing> => {
  try {
    // Verify the vault exists
    const vault = await db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.id, input.vault_id))
      .execute();

    if (vault.length === 0) {
      throw new Error('Vault not found');
    }

    // Verify the user being shared with exists
    const userToShareWith = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.shared_with_user_id))
      .execute();

    if (userToShareWith.length === 0) {
      throw new Error('User to share with not found');
    }

    // Verify the sharing user exists
    const sharingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.shared_by_user_id))
      .execute();

    if (sharingUser.length === 0) {
      throw new Error('Sharing user not found');
    }

    // Check if the sharing user has admin access to the vault
    // They can either be the owner or have admin permission through sharing
    const hasAdminAccess = vault[0].owner_id === input.shared_by_user_id;
    
    if (!hasAdminAccess) {
      // Check if user has admin permission through sharing
      const adminShare = await db.select()
        .from(vaultSharingTable)
        .where(
          and(
            eq(vaultSharingTable.vault_id, input.vault_id),
            eq(vaultSharingTable.shared_with_user_id, input.shared_by_user_id),
            eq(vaultSharingTable.permission_level, 'admin')
          )
        )
        .execute();

      if (adminShare.length === 0) {
        throw new Error('Insufficient permissions to share this vault');
      }
    }

    // Prevent sharing with self
    if (input.shared_with_user_id === input.shared_by_user_id) {
      throw new Error('Cannot share vault with yourself');
    }

    // Prevent sharing with vault owner
    if (input.shared_with_user_id === vault[0].owner_id) {
      throw new Error('Cannot share vault with the owner');
    }

    // Check if vault is already shared with this user
    const existingShare = await db.select()
      .from(vaultSharingTable)
      .where(
        and(
          eq(vaultSharingTable.vault_id, input.vault_id),
          eq(vaultSharingTable.shared_with_user_id, input.shared_with_user_id)
        )
      )
      .execute();

    if (existingShare.length > 0) {
      throw new Error('Vault is already shared with this user');
    }

    // Create the vault sharing record
    const result = await db.insert(vaultSharingTable)
      .values({
        vault_id: input.vault_id,
        shared_with_user_id: input.shared_with_user_id,
        shared_by_user_id: input.shared_by_user_id,
        permission_level: input.permission_level
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Vault sharing failed:', error);
    throw error;
  }
};