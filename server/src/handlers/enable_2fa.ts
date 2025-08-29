import { db } from '../db';
import { usersTable } from '../db/schema';
import { type Enable2FAInput } from '../schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    // Generate 8-character alphanumeric backup codes
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
};

export const enable2FA = async (input: Enable2FAInput): Promise<{ success: boolean; backup_codes: string[] }> => {
  try {
    // First, verify that the user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Update user's 2FA settings
    await db.update(usersTable)
      .set({
        two_factor_enabled: true,
        two_factor_secret: input.secret,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .execute();

    return {
      success: true,
      backup_codes: backupCodes
    };
  } catch (error) {
    console.error('Enable 2FA failed:', error);
    throw error;
  }
};