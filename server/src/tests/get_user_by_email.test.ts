import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserByEmail } from '../handlers/get_user_by_email';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'hashedpassword123',
  first_name: 'John',
  last_name: 'Doe'
};

const secondTestUser: CreateUserInput = {
  email: 'jane@example.com',
  password: 'hashedpassword456',
  first_name: 'Jane',
  last_name: 'Smith'
};

describe('getUserByEmail', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when email exists', async () => {
    // Create a user in the database
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: testUser.password,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Test retrieving the user
    const result = await getUserByEmail('test@example.com');

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.first_name).toEqual('John');
    expect(result!.last_name).toEqual('Doe');
    expect(result!.password_hash).toEqual('hashedpassword123');
    expect(result!.two_factor_enabled).toEqual(false);
    expect(result!.two_factor_secret).toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when email does not exist', async () => {
    const result = await getUserByEmail('nonexistent@example.com');

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple users
    await db.insert(usersTable).values([
      {
        email: testUser.email,
        password_hash: testUser.password,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      },
      {
        email: secondTestUser.email,
        password_hash: secondTestUser.password,
        first_name: secondTestUser.first_name,
        last_name: secondTestUser.last_name
      }
    ]).execute();

    // Test retrieving the second user
    const result = await getUserByEmail('jane@example.com');

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('jane@example.com');
    expect(result!.first_name).toEqual('Jane');
    expect(result!.last_name).toEqual('Smith');
    expect(result!.password_hash).toEqual('hashedpassword456');
  });

  it('should handle email case sensitivity correctly', async () => {
    // Create a user with lowercase email
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: testUser.password,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Test with different case variations
    const lowerResult = await getUserByEmail('test@example.com');
    const upperResult = await getUserByEmail('TEST@EXAMPLE.COM');
    const mixedResult = await getUserByEmail('Test@Example.Com');

    expect(lowerResult).not.toBeNull();
    expect(upperResult).toBeNull(); // Different case should not match
    expect(mixedResult).toBeNull(); // Different case should not match
  });

  it('should handle user with two-factor authentication enabled', async () => {
    // Create a user with 2FA enabled
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: testUser.password,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      two_factor_enabled: true,
      two_factor_secret: 'secret123'
    }).execute();

    const result = await getUserByEmail('test@example.com');

    expect(result).not.toBeNull();
    expect(result!.two_factor_enabled).toEqual(true);
    expect(result!.two_factor_secret).toEqual('secret123');
  });

  it('should handle empty email gracefully', async () => {
    const result = await getUserByEmail('');

    expect(result).toBeNull();
  });
});