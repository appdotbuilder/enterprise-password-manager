import crypto from 'crypto';
import { db } from '../db';
import { usersTable, vaultsTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash the password using crypto.pbkdf2
    const salt = crypto.randomBytes(16).toString('hex');
    const password_hash = crypto.pbkdf2Sync(input.password, salt, 10000, 64, 'sha512').toString('hex') + ':' + salt;

    // Insert user record
    const userResult = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: password_hash,
        first_name: input.first_name,
        last_name: input.last_name,
        two_factor_enabled: false,
        two_factor_secret: null
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create default vault for the user
    const vaultName = `${input.first_name}'s Vault`;
    const encryptionKey = crypto.randomBytes(32).toString('hex');

    await db.insert(vaultsTable)
      .values({
        name: vaultName,
        description: 'Default vault',
        owner_id: user.id,
        encryption_key: encryptionKey
      })
      .execute();

    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};