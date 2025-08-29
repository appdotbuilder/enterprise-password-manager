import { db } from '../db';
import { secureNotesTable, vaultsTable, vaultSharingTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateSecureNoteInput, type SecureNote } from '../schema';
import { eq, or, and } from 'drizzle-orm';
import { createCipheriv, randomBytes } from 'crypto';

const encryptContent = (content: string, encryptionKey: string): string => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = randomBytes(16);
  
  const cipher = createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Prepend IV to encrypted content for decryption
  return iv.toString('hex') + ':' + encrypted;
};

export const createSecureNote = async (input: CreateSecureNoteInput): Promise<SecureNote> => {
  try {
    // Verify vault exists and get encryption key
    const vault = await db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.id, input.vault_id))
      .execute();

    if (vault.length === 0) {
      throw new Error('Vault not found');
    }

    const vaultData = vault[0];

    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Check if user has write access to vault
    const hasAccess = await db.select()
      .from(vaultsTable)
      .where(
        and(
          eq(vaultsTable.id, input.vault_id),
          or(
            eq(vaultsTable.owner_id, input.created_by), // Owner has access
            // Or user has shared access with write/admin permissions
            eq(vaultSharingTable.shared_with_user_id, input.created_by)
          )
        )
      )
      .leftJoin(vaultSharingTable, and(
        eq(vaultSharingTable.vault_id, vaultsTable.id),
        eq(vaultSharingTable.shared_with_user_id, input.created_by),
        or(
          eq(vaultSharingTable.permission_level, 'write'),
          eq(vaultSharingTable.permission_level, 'admin')
        )
      ))
      .execute();

    if (hasAccess.length === 0) {
      throw new Error('User does not have write access to this vault');
    }

    // Verify category exists and belongs to the vault (if provided)
    if (input.category_id) {
      const category = await db.select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, input.category_id),
            eq(categoriesTable.vault_id, input.vault_id)
          )
        )
        .execute();

      if (category.length === 0) {
        throw new Error('Category not found or does not belong to the specified vault');
      }
    }

    // Encrypt the content using vault's encryption key
    const encryptedContent = encryptContent(input.content, vaultData.encryption_key);

    // Insert secure note record
    const result = await db.insert(secureNotesTable)
      .values({
        title: input.title,
        encrypted_content: encryptedContent,
        vault_id: input.vault_id,
        category_id: input.category_id || null,
        created_by: input.created_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Secure note creation failed:', error);
    throw error;
  }
};