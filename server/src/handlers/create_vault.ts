import { db } from '../db';
import { vaultsTable, usersTable } from '../db/schema';
import { type CreateVaultInput, type Vault } from '../schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const createVault = async (input: CreateVaultInput): Promise<Vault> => {
  try {
    // Verify that the owner exists
    const ownerExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.owner_id))
      .execute();

    if (ownerExists.length === 0) {
      throw new Error(`User with id ${input.owner_id} does not exist`);
    }

    // Generate a secure encryption key (256-bit key as hex string)
    const encryptionKey = randomBytes(32).toString('hex');

    // Insert vault record
    const result = await db.insert(vaultsTable)
      .values({
        name: input.name,
        description: input.description || null,
        owner_id: input.owner_id,
        encryption_key: encryptionKey
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Vault creation failed:', error);
    throw error;
  }
};