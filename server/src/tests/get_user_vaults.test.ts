import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vaultsTable, vaultSharingTable } from '../db/schema';
import { getUserVaults } from '../handlers/get_user_vaults';

describe('getUserVaults', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return owned vaults for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create owned vault
    await db.insert(vaultsTable)
      .values({
        name: 'My Personal Vault',
        description: 'Personal vault for testing',
        owner_id: userId,
        encryption_key: 'test_encryption_key'
      })
      .execute();

    const result = await getUserVaults(userId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('My Personal Vault');
    expect(result[0].description).toEqual('Personal vault for testing');
    expect(result[0].owner_id).toEqual(userId);
    expect(result[0].encryption_key).toEqual('test_encryption_key');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return shared vaults for a user', async () => {
    // Create test users
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        first_name: 'Vault',
        last_name: 'Owner'
      })
      .returning()
      .execute();

    const sharedUserResult = await db.insert(usersTable)
      .values({
        email: 'shared@example.com',
        password_hash: 'hashed_password',
        first_name: 'Shared',
        last_name: 'User'
      })
      .returning()
      .execute();

    const ownerId = ownerResult[0].id;
    const sharedUserId = sharedUserResult[0].id;

    // Create vault owned by first user
    const vaultResult = await db.insert(vaultsTable)
      .values({
        name: 'Shared Vault',
        description: 'Vault shared with others',
        owner_id: ownerId,
        encryption_key: 'shared_encryption_key'
      })
      .returning()
      .execute();

    const vaultId = vaultResult[0].id;

    // Share vault with second user
    await db.insert(vaultSharingTable)
      .values({
        vault_id: vaultId,
        shared_with_user_id: sharedUserId,
        shared_by_user_id: ownerId,
        permission_level: 'read'
      })
      .execute();

    const result = await getUserVaults(sharedUserId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Shared Vault');
    expect(result[0].description).toEqual('Vault shared with others');
    expect(result[0].owner_id).toEqual(ownerId); // Still owned by original owner
    expect(result[0].encryption_key).toEqual('shared_encryption_key');
  });

  it('should return both owned and shared vaults for a user', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create owned vault for user1
    const ownedVaultResult = await db.insert(vaultsTable)
      .values({
        name: 'User1 Personal Vault',
        description: 'Personal vault',
        owner_id: user1Id,
        encryption_key: 'personal_key'
      })
      .returning()
      .execute();

    // Create vault owned by user2
    const sharedVaultResult = await db.insert(vaultsTable)
      .values({
        name: 'User2 Shared Vault',
        description: 'Shared vault',
        owner_id: user2Id,
        encryption_key: 'shared_key'
      })
      .returning()
      .execute();

    // Share user2's vault with user1
    await db.insert(vaultSharingTable)
      .values({
        vault_id: sharedVaultResult[0].id,
        shared_with_user_id: user1Id,
        shared_by_user_id: user2Id,
        permission_level: 'write'
      })
      .execute();

    const result = await getUserVaults(user1Id);

    expect(result).toHaveLength(2);
    
    // Find owned and shared vaults
    const ownedVault = result.find(v => v.name === 'User1 Personal Vault');
    const sharedVault = result.find(v => v.name === 'User2 Shared Vault');

    expect(ownedVault).toBeDefined();
    expect(ownedVault!.owner_id).toEqual(user1Id);

    expect(sharedVault).toBeDefined();
    expect(sharedVault!.owner_id).toEqual(user2Id); // Still owned by user2
  });

  it('should deduplicate vaults if user owns a vault that is also shared with them', async () => {
    // Create test users
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        first_name: 'Owner',
        last_name: 'User'
      })
      .returning()
      .execute();

    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password',
        first_name: 'Other',
        last_name: 'User'
      })
      .returning()
      .execute();

    const ownerId = ownerResult[0].id;
    const otherId = anotherUserResult[0].id;

    // Create vault owned by owner
    const vaultResult = await db.insert(vaultsTable)
      .values({
        name: 'Duplicate Test Vault',
        description: 'Vault for testing deduplication',
        owner_id: ownerId,
        encryption_key: 'duplicate_key'
      })
      .returning()
      .execute();

    const vaultId = vaultResult[0].id;

    // Share the vault back to the owner (unusual but possible scenario)
    await db.insert(vaultSharingTable)
      .values({
        vault_id: vaultId,
        shared_with_user_id: ownerId,
        shared_by_user_id: otherId,
        permission_level: 'admin'
      })
      .execute();

    const result = await getUserVaults(ownerId);

    // Should only return one vault, not duplicate
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Duplicate Test Vault');
    expect(result[0].owner_id).toEqual(ownerId);
  });

  it('should return empty array for user with no vaults', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'novaults@example.com',
        password_hash: 'hashed_password',
        first_name: 'No',
        last_name: 'Vaults'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getUserVaults(userId);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return vaults with different permission levels', async () => {
    // Create test users
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        first_name: 'Vault',
        last_name: 'Owner'
      })
      .returning()
      .execute();

    const sharedUserResult = await db.insert(usersTable)
      .values({
        email: 'shared@example.com',
        password_hash: 'hashed_password',
        first_name: 'Shared',
        last_name: 'User'
      })
      .returning()
      .execute();

    const ownerId = ownerResult[0].id;
    const sharedUserId = sharedUserResult[0].id;

    // Create multiple vaults with different sharing permissions
    const vault1Result = await db.insert(vaultsTable)
      .values({
        name: 'Read Only Vault',
        owner_id: ownerId,
        encryption_key: 'read_key'
      })
      .returning()
      .execute();

    const vault2Result = await db.insert(vaultsTable)
      .values({
        name: 'Admin Vault',
        owner_id: ownerId,
        encryption_key: 'admin_key'
      })
      .returning()
      .execute();

    // Share vaults with different permission levels
    await db.insert(vaultSharingTable)
      .values([
        {
          vault_id: vault1Result[0].id,
          shared_with_user_id: sharedUserId,
          shared_by_user_id: ownerId,
          permission_level: 'read'
        },
        {
          vault_id: vault2Result[0].id,
          shared_with_user_id: sharedUserId,
          shared_by_user_id: ownerId,
          permission_level: 'admin'
        }
      ])
      .execute();

    const result = await getUserVaults(sharedUserId);

    expect(result).toHaveLength(2);
    
    const readVault = result.find(v => v.name === 'Read Only Vault');
    const adminVault = result.find(v => v.name === 'Admin Vault');

    expect(readVault).toBeDefined();
    expect(adminVault).toBeDefined();
    expect(readVault!.owner_id).toEqual(ownerId);
    expect(adminVault!.owner_id).toEqual(ownerId);
  });
});