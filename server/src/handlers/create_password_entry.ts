import { db } from '../db';
import { passwordEntriesTable, vaultsTable, categoriesTable, vaultSharingTable } from '../db/schema';
import { type CreatePasswordEntryInput, type PasswordEntry } from '../schema';
import { eq, or, and } from 'drizzle-orm';
import { createHash } from 'crypto';

// Simple encryption function for demonstration
// In production, use a proper encryption library like crypto-js or node:crypto with AES
const encryptPassword = (password: string, encryptionKey: string): string => {
  const hash = createHash('sha256');
  hash.update(password + encryptionKey);
  return hash.digest('hex');
};

export const createPasswordEntry = async (input: CreatePasswordEntryInput): Promise<PasswordEntry> => {
  try {
    // Verify vault exists and get encryption key
    const vaults = await db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.id, input.vault_id))
      .execute();

    if (vaults.length === 0) {
      throw new Error('Vault not found');
    }

    const vault = vaults[0];

    // Verify user has write access (owner or shared with write/admin permissions)
    const hasAccess = vault.owner_id === input.created_by;
    
    if (!hasAccess) {
      const sharedAccess = await db.select()
        .from(vaultSharingTable)
        .where(
          and(
            eq(vaultSharingTable.vault_id, input.vault_id),
            eq(vaultSharingTable.shared_with_user_id, input.created_by),
            or(
              eq(vaultSharingTable.permission_level, 'write'),
              eq(vaultSharingTable.permission_level, 'admin')
            )
          )
        )
        .execute();

      if (sharedAccess.length === 0) {
        throw new Error('Insufficient permissions to create password entry in this vault');
      }
    }

    // If category_id is provided, verify it exists and belongs to the vault
    if (input.category_id) {
      const categories = await db.select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, input.category_id),
            eq(categoriesTable.vault_id, input.vault_id)
          )
        )
        .execute();

      if (categories.length === 0) {
        throw new Error('Category not found or does not belong to the specified vault');
      }
    }

    // Encrypt the password using the vault's encryption key
    const encryptedPassword = encryptPassword(input.password, vault.encryption_key);

    // Insert password entry record
    const result = await db.insert(passwordEntriesTable)
      .values({
        title: input.title,
        username: input.username || null,
        encrypted_password: encryptedPassword,
        url: input.url || null,
        notes: input.notes || null,
        vault_id: input.vault_id,
        category_id: input.category_id || null,
        created_by: input.created_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Password entry creation failed:', error);
    throw error;
  }
};