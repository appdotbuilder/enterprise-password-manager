import { db } from '../db';
import { creditCardsTable, vaultsTable, categoriesTable, vaultSharingTable, usersTable } from '../db/schema';
import { type CreateCreditCardInput, type CreditCard } from '../schema';
import { eq, and, or } from 'drizzle-orm';
import crypto from 'crypto';

// Simple AES-256-CBC encryption using the vault's encryption key
const encryptData = (data: string, key: string): string => {
  const iv = crypto.randomBytes(16);
  const keyHash = crypto.createHash('sha256').update(key).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', keyHash, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Combine IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
};

export const createCreditCard = async (input: CreateCreditCardInput): Promise<CreditCard> => {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Verify vault exists and get encryption key
    const vaults = await db.select()
      .from(vaultsTable)
      .where(eq(vaultsTable.id, input.vault_id))
      .execute();

    if (vaults.length === 0) {
      throw new Error('Vault not found');
    }

    const vault = vaults[0];

    // Check if user has write access to vault (owner or shared with write/admin permission)
    const hasAccess = vault.owner_id === input.created_by;
    
    if (!hasAccess) {
      const sharedVaults = await db.select()
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

      if (sharedVaults.length === 0) {
        throw new Error('Insufficient permissions to create credit card in this vault');
      }
    }

    // Verify category exists and belongs to the vault (if provided)
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

    // Encrypt sensitive data using vault's encryption key
    const encryptedCardNumber = encryptData(input.card_number, vault.encryption_key);
    const encryptedCvv = encryptData(input.cvv, vault.encryption_key);

    // Insert credit card record
    const result = await db.insert(creditCardsTable)
      .values({
        title: input.title,
        cardholder_name: input.cardholder_name,
        encrypted_card_number: encryptedCardNumber,
        encrypted_cvv: encryptedCvv,
        expiry_month: input.expiry_month,
        expiry_year: input.expiry_year,
        vault_id: input.vault_id,
        category_id: input.category_id || null,
        created_by: input.created_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Credit card creation failed:', error);
    throw error;
  }
};