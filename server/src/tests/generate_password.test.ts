import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type GeneratePasswordInput } from '../schema';
import { generatePassword } from '../handlers/generate_password';

describe('generatePassword', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate password with default settings', async () => {
    const input: GeneratePasswordInput = {
      length: 16,
      include_uppercase: true,
      include_lowercase: true,
      include_numbers: true,
      include_symbols: true,
      exclude_ambiguous: false
    };

    const result = await generatePassword(input);

    expect(result.password).toBeDefined();
    expect(result.password.length).toBe(16);
    expect(result.strength).toBeOneOf(['weak', 'fair', 'good', 'strong', 'very_strong']);
    expect(typeof result.password).toBe('string');
  });

  it('should generate password with only lowercase letters', async () => {
    const input: GeneratePasswordInput = {
      length: 12,
      include_uppercase: false,
      include_lowercase: true,
      include_numbers: false,
      include_symbols: false,
      exclude_ambiguous: false
    };

    const result = await generatePassword(input);

    expect(result.password.length).toBe(12);
    expect(result.password).toMatch(/^[a-z]+$/);
    expect(result.strength).toBeDefined();
  });

  it('should generate password with only uppercase letters', async () => {
    const input: GeneratePasswordInput = {
      length: 8,
      include_uppercase: true,
      include_lowercase: false,
      include_numbers: false,
      include_symbols: false,
      exclude_ambiguous: false
    };

    const result = await generatePassword(input);

    expect(result.password.length).toBe(8);
    expect(result.password).toMatch(/^[A-Z]+$/);
    expect(result.strength).toBeDefined();
  });

  it('should generate password with only numbers', async () => {
    const input: GeneratePasswordInput = {
      length: 10,
      include_uppercase: false,
      include_lowercase: false,
      include_numbers: true,
      include_symbols: false,
      exclude_ambiguous: false
    };

    const result = await generatePassword(input);

    expect(result.password.length).toBe(10);
    expect(result.password).toMatch(/^[0-9]+$/);
    expect(result.strength).toBeDefined();
  });

  it('should generate password with only symbols', async () => {
    const input: GeneratePasswordInput = {
      length: 6,
      include_uppercase: false,
      include_lowercase: false,
      include_numbers: false,
      include_symbols: true,
      exclude_ambiguous: false
    };

    const result = await generatePassword(input);

    expect(result.password.length).toBe(6);
    expect(result.password).toMatch(/^[!@#$%^&*()_+\-=[\]{}|;:,.<>?]+$/);
    expect(result.strength).toBeDefined();
  });

  it('should generate password with mixed character types', async () => {
    const input: GeneratePasswordInput = {
      length: 20,
      include_uppercase: true,
      include_lowercase: true,
      include_numbers: true,
      include_symbols: true,
      exclude_ambiguous: false
    };

    const result = await generatePassword(input);

    expect(result.password.length).toBe(20);
    
    // Password should contain characters from all selected types
    // Note: Due to randomness, we can't guarantee all types will appear,
    // but we can verify the charset was built correctly by checking length constraints
    expect(result.password).toMatch(/^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]+$/);
    expect(result.strength).toBeDefined();
  });

  it('should exclude ambiguous characters when requested', async () => {
    const input: GeneratePasswordInput = {
      length: 50, // Large length to increase chance of hitting ambiguous chars if not excluded
      include_uppercase: true,
      include_lowercase: true,
      include_numbers: true,
      include_symbols: false,
      exclude_ambiguous: true
    };

    const result = await generatePassword(input);

    expect(result.password.length).toBe(50);
    // Should not contain: 0 (zero), O (capital o), l (lowercase L), I (capital i), 1 (one)
    expect(result.password).not.toMatch(/[0Ol1Il]/);
    expect(result.strength).toBeDefined();
  });

  it('should generate different passwords on multiple calls', async () => {
    const input: GeneratePasswordInput = {
      length: 16,
      include_uppercase: true,
      include_lowercase: true,
      include_numbers: true,
      include_symbols: true,
      exclude_ambiguous: false
    };

    const result1 = await generatePassword(input);
    const result2 = await generatePassword(input);
    const result3 = await generatePassword(input);

    // Passwords should be different (extremely unlikely to be the same with cryptographic randomness)
    expect(result1.password).not.toBe(result2.password);
    expect(result1.password).not.toBe(result3.password);
    expect(result2.password).not.toBe(result3.password);
  });

  it('should respect minimum and maximum length constraints', async () => {
    const shortInput: GeneratePasswordInput = {
      length: 4, // Minimum length
      include_uppercase: true,
      include_lowercase: true,
      include_numbers: true,
      include_symbols: true,
      exclude_ambiguous: false
    };

    const longInput: GeneratePasswordInput = {
      length: 128, // Maximum length
      include_uppercase: true,
      include_lowercase: true,
      include_numbers: true,
      include_symbols: true,
      exclude_ambiguous: false
    };

    const shortResult = await generatePassword(shortInput);
    const longResult = await generatePassword(longInput);

    expect(shortResult.password.length).toBe(4);
    expect(longResult.password.length).toBe(128);
  });

  it('should calculate strength correctly for different scenarios', async () => {
    // Short password with limited character types - should be weak
    const weakInput: GeneratePasswordInput = {
      length: 4,
      include_uppercase: false,
      include_lowercase: true,
      include_numbers: false,
      include_symbols: false,
      exclude_ambiguous: false
    };

    // Long password with all character types - should be very strong
    const strongInput: GeneratePasswordInput = {
      length: 24,
      include_uppercase: true,
      include_lowercase: true,
      include_numbers: true,
      include_symbols: true,
      exclude_ambiguous: false
    };

    const weakResult = await generatePassword(weakInput);
    const strongResult = await generatePassword(strongInput);

    expect(weakResult.strength).toBe('weak');
    expect(['strong', 'very_strong']).toContain(strongResult.strength);
  });

  it('should throw error when no character types are selected', async () => {
    const input: GeneratePasswordInput = {
      length: 16,
      include_uppercase: false,
      include_lowercase: false,
      include_numbers: false,
      include_symbols: false,
      exclude_ambiguous: false
    };

    await expect(generatePassword(input)).rejects.toThrow(/no character types selected/i);
  });

  it('should handle edge case with ambiguous exclusion and limited character sets', async () => {
    // Test with only numbers and exclude ambiguous (removes 0 and 1)
    const input: GeneratePasswordInput = {
      length: 10,
      include_uppercase: false,
      include_lowercase: false,
      include_numbers: true,
      include_symbols: false,
      exclude_ambiguous: true
    };

    const result = await generatePassword(input);

    expect(result.password.length).toBe(10);
    expect(result.password).toMatch(/^[23456789]+$/); // Only 2-9 should remain
    expect(result.password).not.toMatch(/[01]/);
  });
});