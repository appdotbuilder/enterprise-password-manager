import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vaultsTable, vaultSharingTable } from '../db/schema';
import { type ShareVaultInput } from '../schema';
import { shareVault } from '../handlers/share_vault';
import { eq, and } from 'drizzle-orm';

// Test users data
const testUser1 = {
  email: 'owner@test.com',
  password_hash: 'hashed_password_1',
  first_name: 'Vault',
  last_name: 'Owner'
};

const testUser2 = {
  email: 'user2@test.com',
  password_hash: 'hashed_password_2',
  first_name: 'User',
  last_name: 'Two'
};

const testUser3 = {
  email: 'admin@test.com',
  password_hash: 'hashed_password_3',
  first_name: 'Admin',
  last_name: 'User'
};

// Test vault data
const testVault = {
  name: 'Test Vault',
  description: 'A vault for testing',
  owner_id: 0, // Will be set after user creation
  encryption_key: 'test_encryption_key'
};

describe('shareVault', () => {
  let user1Id: number;
  let user2Id: number;
  let user3Id: number;
  let vaultId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .returning()
      .execute();

    user1Id = users[0].id;
    user2Id = users[1].id;
    user3Id = users[2].id;

    // Create test vault
    const vaults = await db.insert(vaultsTable)
      .values({ ...testVault, owner_id: user1Id })
      .returning()
      .execute();

    vaultId = vaults[0].id;
  });

  afterEach(resetDB);

  it('should successfully share vault with valid permissions', async () => {
    const input: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user2Id,
      shared_by_user_id: user1Id,
      permission_level: 'read'
    };

    const result = await shareVault(input);

    expect(result.vault_id).toEqual(vaultId);
    expect(result.shared_with_user_id).toEqual(user2Id);
    expect(result.shared_by_user_id).toEqual(user1Id);
    expect(result.permission_level).toEqual('read');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save vault sharing to database', async () => {
    const input: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user2Id,
      shared_by_user_id: user1Id,
      permission_level: 'write'
    };

    const result = await shareVault(input);

    const shares = await db.select()
      .from(vaultSharingTable)
      .where(eq(vaultSharingTable.id, result.id))
      .execute();

    expect(shares).toHaveLength(1);
    expect(shares[0].vault_id).toEqual(vaultId);
    expect(shares[0].shared_with_user_id).toEqual(user2Id);
    expect(shares[0].shared_by_user_id).toEqual(user1Id);
    expect(shares[0].permission_level).toEqual('write');
  });

  it('should allow admin user to share vault', async () => {
    // First, give user3 admin access to the vault
    await db.insert(vaultSharingTable)
      .values({
        vault_id: vaultId,
        shared_with_user_id: user3Id,
        shared_by_user_id: user1Id,
        permission_level: 'admin'
      })
      .execute();

    // Now user3 (admin) should be able to share the vault
    const input: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user2Id,
      shared_by_user_id: user3Id,
      permission_level: 'read'
    };

    const result = await shareVault(input);

    expect(result.shared_by_user_id).toEqual(user3Id);
    expect(result.permission_level).toEqual('read');
  });

  it('should support all permission levels', async () => {
    const permissionLevels = ['read', 'write', 'admin'] as const;

    for (let i = 0; i < permissionLevels.length; i++) {
      const level = permissionLevels[i];
      // Create a new user for each permission level to avoid conflicts
      const newUser = await db.insert(usersTable)
        .values({
          email: `${level}_${Date.now()}_${i}@test.com`, // Use timestamp and index to ensure uniqueness
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: 'User'
        })
        .returning()
        .execute();

      const input: ShareVaultInput = {
        vault_id: vaultId,
        shared_with_user_id: newUser[0].id,
        shared_by_user_id: user1Id,
        permission_level: level
      };

      const result = await shareVault(input);
      expect(result.permission_level).toEqual(level);
    }
  });

  it('should throw error if vault does not exist', async () => {
    const input: ShareVaultInput = {
      vault_id: 99999,
      shared_with_user_id: user2Id,
      shared_by_user_id: user1Id,
      permission_level: 'read'
    };

    expect(shareVault(input)).rejects.toThrow(/vault not found/i);
  });

  it('should throw error if user to share with does not exist', async () => {
    const input: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: 99999,
      shared_by_user_id: user1Id,
      permission_level: 'read'
    };

    expect(shareVault(input)).rejects.toThrow(/user to share with not found/i);
  });

  it('should throw error if sharing user does not exist', async () => {
    const input: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user2Id,
      shared_by_user_id: 99999,
      permission_level: 'read'
    };

    expect(shareVault(input)).rejects.toThrow(/sharing user not found/i);
  });

  it('should throw error if sharing user lacks permissions', async () => {
    const input: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user3Id,
      shared_by_user_id: user2Id, // user2 is not owner or admin
      permission_level: 'read'
    };

    expect(shareVault(input)).rejects.toThrow(/insufficient permissions/i);
  });

  it('should throw error when trying to share with self', async () => {
    const input: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user1Id,
      shared_by_user_id: user1Id,
      permission_level: 'read'
    };

    expect(shareVault(input)).rejects.toThrow(/cannot share vault with yourself/i);
  });

  it('should throw error when trying to share with vault owner', async () => {
    const input: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user1Id, // user1 is the owner
      shared_by_user_id: user2Id,
      permission_level: 'read'
    };

    // First give user2 admin access so they can attempt to share
    await db.insert(vaultSharingTable)
      .values({
        vault_id: vaultId,
        shared_with_user_id: user2Id,
        shared_by_user_id: user1Id,
        permission_level: 'admin'
      })
      .execute();

    expect(shareVault(input)).rejects.toThrow(/cannot share vault with the owner/i);
  });

  it('should throw error if vault is already shared with user', async () => {
    // First share the vault
    const firstInput: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user2Id,
      shared_by_user_id: user1Id,
      permission_level: 'read'
    };

    await shareVault(firstInput);

    // Try to share again
    const secondInput: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user2Id,
      shared_by_user_id: user1Id,
      permission_level: 'write'
    };

    expect(shareVault(secondInput)).rejects.toThrow(/vault is already shared with this user/i);
  });

  it('should handle user with write permission trying to share', async () => {
    // Give user2 write access (not admin)
    await db.insert(vaultSharingTable)
      .values({
        vault_id: vaultId,
        shared_with_user_id: user2Id,
        shared_by_user_id: user1Id,
        permission_level: 'write'
      })
      .execute();

    // user2 with write permission should not be able to share
    const input: ShareVaultInput = {
      vault_id: vaultId,
      shared_with_user_id: user3Id,
      shared_by_user_id: user2Id,
      permission_level: 'read'
    };

    expect(shareVault(input)).rejects.toThrow(/insufficient permissions/i);
  });
});