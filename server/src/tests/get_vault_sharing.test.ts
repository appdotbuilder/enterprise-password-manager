import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vaultsTable, vaultSharingTable } from '../db/schema';
import { getVaultSharing } from '../handlers/get_vault_sharing';
import { eq } from 'drizzle-orm';

describe('getVaultSharing', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return vault sharing records for a specific vault', async () => {
    // Create test users
    const usersResult = await db.insert(usersTable)
      .values([
        {
          email: 'owner@example.com',
          password_hash: 'hashed_password',
          first_name: 'Owner',
          last_name: 'User'
        },
        {
          email: 'shared1@example.com',
          password_hash: 'hashed_password',
          first_name: 'Shared',
          last_name: 'User1'
        },
        {
          email: 'shared2@example.com',
          password_hash: 'hashed_password',
          first_name: 'Shared',
          last_name: 'User2'
        }
      ])
      .returning()
      .execute();

    const [owner, shared1, shared2] = usersResult;

    // Create test vault
    const vaultResult = await db.insert(vaultsTable)
      .values({
        name: 'Test Vault',
        description: 'A vault for testing',
        owner_id: owner.id,
        encryption_key: 'test_key'
      })
      .returning()
      .execute();

    const vault = vaultResult[0];

    // Create vault sharing records
    await db.insert(vaultSharingTable)
      .values([
        {
          vault_id: vault.id,
          shared_with_user_id: shared1.id,
          shared_by_user_id: owner.id,
          permission_level: 'read'
        },
        {
          vault_id: vault.id,
          shared_with_user_id: shared2.id,
          shared_by_user_id: owner.id,
          permission_level: 'write'
        }
      ])
      .execute();

    const result = await getVaultSharing(vault.id);

    // Verify results
    expect(result).toHaveLength(2);
    
    // Sort results by shared_with_user_id for consistent testing
    result.sort((a, b) => a.shared_with_user_id - b.shared_with_user_id);

    expect(result[0].vault_id).toEqual(vault.id);
    expect(result[0].shared_with_user_id).toEqual(shared1.id);
    expect(result[0].shared_by_user_id).toEqual(owner.id);
    expect(result[0].permission_level).toEqual('read');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();

    expect(result[1].vault_id).toEqual(vault.id);
    expect(result[1].shared_with_user_id).toEqual(shared2.id);
    expect(result[1].shared_by_user_id).toEqual(owner.id);
    expect(result[1].permission_level).toEqual('write');
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].id).toBeDefined();
  });

  it('should return empty array for vault with no sharing', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        first_name: 'Owner',
        last_name: 'User'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test vault
    const vaultResult = await db.insert(vaultsTable)
      .values({
        name: 'Private Vault',
        description: 'A vault with no sharing',
        owner_id: user.id,
        encryption_key: 'test_key'
      })
      .returning()
      .execute();

    const vault = vaultResult[0];

    const result = await getVaultSharing(vault.id);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent vault', async () => {
    const result = await getVaultSharing(999999);

    expect(result).toHaveLength(0);
  });

  it('should only return sharing records for the specified vault', async () => {
    // Create test users
    const usersResult = await db.insert(usersTable)
      .values([
        {
          email: 'owner@example.com',
          password_hash: 'hashed_password',
          first_name: 'Owner',
          last_name: 'User'
        },
        {
          email: 'shared@example.com',
          password_hash: 'hashed_password',
          first_name: 'Shared',
          last_name: 'User'
        }
      ])
      .returning()
      .execute();

    const [owner, shared] = usersResult;

    // Create two test vaults
    const vaultsResult = await db.insert(vaultsTable)
      .values([
        {
          name: 'Vault 1',
          description: 'First vault',
          owner_id: owner.id,
          encryption_key: 'test_key_1'
        },
        {
          name: 'Vault 2',
          description: 'Second vault',
          owner_id: owner.id,
          encryption_key: 'test_key_2'
        }
      ])
      .returning()
      .execute();

    const [vault1, vault2] = vaultsResult;

    // Create sharing records for both vaults
    await db.insert(vaultSharingTable)
      .values([
        {
          vault_id: vault1.id,
          shared_with_user_id: shared.id,
          shared_by_user_id: owner.id,
          permission_level: 'read'
        },
        {
          vault_id: vault2.id,
          shared_with_user_id: shared.id,
          shared_by_user_id: owner.id,
          permission_level: 'write'
        }
      ])
      .execute();

    // Get sharing records for first vault only
    const result = await getVaultSharing(vault1.id);

    expect(result).toHaveLength(1);
    expect(result[0].vault_id).toEqual(vault1.id);
    expect(result[0].permission_level).toEqual('read');

    // Verify that vault2 sharing is not included
    const vault2Sharing = result.find(record => record.vault_id === vault2.id);
    expect(vault2Sharing).toBeUndefined();
  });

  it('should return all permission levels correctly', async () => {
    // Create test users
    const usersResult = await db.insert(usersTable)
      .values([
        {
          email: 'owner@example.com',
          password_hash: 'hashed_password',
          first_name: 'Owner',
          last_name: 'User'
        },
        {
          email: 'read@example.com',
          password_hash: 'hashed_password',
          first_name: 'Read',
          last_name: 'User'
        },
        {
          email: 'write@example.com',
          password_hash: 'hashed_password',
          first_name: 'Write',
          last_name: 'User'
        },
        {
          email: 'admin@example.com',
          password_hash: 'hashed_password',
          first_name: 'Admin',
          last_name: 'User'
        }
      ])
      .returning()
      .execute();

    const [owner, readUser, writeUser, adminUser] = usersResult;

    // Create test vault
    const vaultResult = await db.insert(vaultsTable)
      .values({
        name: 'Multi-Permission Vault',
        description: 'A vault with different permission levels',
        owner_id: owner.id,
        encryption_key: 'test_key'
      })
      .returning()
      .execute();

    const vault = vaultResult[0];

    // Create vault sharing records with different permission levels
    await db.insert(vaultSharingTable)
      .values([
        {
          vault_id: vault.id,
          shared_with_user_id: readUser.id,
          shared_by_user_id: owner.id,
          permission_level: 'read'
        },
        {
          vault_id: vault.id,
          shared_with_user_id: writeUser.id,
          shared_by_user_id: owner.id,
          permission_level: 'write'
        },
        {
          vault_id: vault.id,
          shared_with_user_id: adminUser.id,
          shared_by_user_id: owner.id,
          permission_level: 'admin'
        }
      ])
      .execute();

    const result = await getVaultSharing(vault.id);

    expect(result).toHaveLength(3);

    // Check all permission levels are present
    const permissions = result.map(record => record.permission_level).sort();
    expect(permissions).toEqual(['admin', 'read', 'write']);

    // Verify specific permission assignments
    const readRecord = result.find(record => record.shared_with_user_id === readUser.id);
    expect(readRecord?.permission_level).toEqual('read');

    const writeRecord = result.find(record => record.shared_with_user_id === writeUser.id);
    expect(writeRecord?.permission_level).toEqual('write');

    const adminRecord = result.find(record => record.shared_with_user_id === adminUser.id);
    expect(adminRecord?.permission_level).toEqual('admin');
  });

  it('should save sharing records correctly in database', async () => {
    // Create test users
    const usersResult = await db.insert(usersTable)
      .values([
        {
          email: 'owner@example.com',
          password_hash: 'hashed_password',
          first_name: 'Owner',
          last_name: 'User'
        },
        {
          email: 'shared@example.com',
          password_hash: 'hashed_password',
          first_name: 'Shared',
          last_name: 'User'
        }
      ])
      .returning()
      .execute();

    const [owner, shared] = usersResult;

    // Create test vault
    const vaultResult = await db.insert(vaultsTable)
      .values({
        name: 'Test Vault',
        description: 'A vault for testing',
        owner_id: owner.id,
        encryption_key: 'test_key'
      })
      .returning()
      .execute();

    const vault = vaultResult[0];

    // Create vault sharing record
    await db.insert(vaultSharingTable)
      .values({
        vault_id: vault.id,
        shared_with_user_id: shared.id,
        shared_by_user_id: owner.id,
        permission_level: 'admin'
      })
      .execute();

    // Get sharing records through handler
    const handlerResult = await getVaultSharing(vault.id);

    // Verify handler result matches database state
    const dbRecords = await db.select()
      .from(vaultSharingTable)
      .where(eq(vaultSharingTable.vault_id, vault.id))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(dbRecords).toHaveLength(1);
    expect(handlerResult[0].id).toEqual(dbRecords[0].id);
    expect(handlerResult[0].vault_id).toEqual(dbRecords[0].vault_id);
    expect(handlerResult[0].shared_with_user_id).toEqual(dbRecords[0].shared_with_user_id);
    expect(handlerResult[0].shared_by_user_id).toEqual(dbRecords[0].shared_by_user_id);
    expect(handlerResult[0].permission_level).toEqual(dbRecords[0].permission_level);
  });
});