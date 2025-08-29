import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  two_factor_enabled: z.boolean(),
  two_factor_secret: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Vault schema
export const vaultSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  owner_id: z.number(),
  encryption_key: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Vault = z.infer<typeof vaultSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  vault_id: z.number(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Password entry schema
export const passwordEntrySchema = z.object({
  id: z.number(),
  title: z.string(),
  username: z.string().nullable(),
  encrypted_password: z.string(),
  url: z.string().nullable(),
  notes: z.string().nullable(),
  vault_id: z.number(),
  category_id: z.number().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PasswordEntry = z.infer<typeof passwordEntrySchema>;

// Secure note schema
export const secureNoteSchema = z.object({
  id: z.number(),
  title: z.string(),
  encrypted_content: z.string(),
  vault_id: z.number(),
  category_id: z.number().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SecureNote = z.infer<typeof secureNoteSchema>;

// Credit card schema
export const creditCardSchema = z.object({
  id: z.number(),
  title: z.string(),
  cardholder_name: z.string(),
  encrypted_card_number: z.string(),
  encrypted_cvv: z.string(),
  expiry_month: z.number().int().min(1).max(12),
  expiry_year: z.number().int(),
  vault_id: z.number(),
  category_id: z.number().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CreditCard = z.infer<typeof creditCardSchema>;

// Vault sharing schema
export const vaultSharingSchema = z.object({
  id: z.number(),
  vault_id: z.number(),
  shared_with_user_id: z.number(),
  shared_by_user_id: z.number(),
  permission_level: z.enum(['read', 'write', 'admin']),
  created_at: z.coerce.date()
});

export type VaultSharing = z.infer<typeof vaultSharingSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string(),
  last_name: z.string()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createVaultInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  owner_id: z.number()
});

export type CreateVaultInput = z.infer<typeof createVaultInputSchema>;

export const createCategoryInputSchema = z.object({
  name: z.string(),
  vault_id: z.number()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createPasswordEntryInputSchema = z.object({
  title: z.string(),
  username: z.string().nullable().optional(),
  password: z.string(),
  url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  vault_id: z.number(),
  category_id: z.number().nullable().optional(),
  created_by: z.number()
});

export type CreatePasswordEntryInput = z.infer<typeof createPasswordEntryInputSchema>;

export const createSecureNoteInputSchema = z.object({
  title: z.string(),
  content: z.string(),
  vault_id: z.number(),
  category_id: z.number().nullable().optional(),
  created_by: z.number()
});

export type CreateSecureNoteInput = z.infer<typeof createSecureNoteInputSchema>;

export const createCreditCardInputSchema = z.object({
  title: z.string(),
  cardholder_name: z.string(),
  card_number: z.string(),
  cvv: z.string(),
  expiry_month: z.number().int().min(1).max(12),
  expiry_year: z.number().int(),
  vault_id: z.number(),
  category_id: z.number().nullable().optional(),
  created_by: z.number()
});

export type CreateCreditCardInput = z.infer<typeof createCreditCardInputSchema>;

export const shareVaultInputSchema = z.object({
  vault_id: z.number(),
  shared_with_user_id: z.number(),
  shared_by_user_id: z.number(),
  permission_level: z.enum(['read', 'write', 'admin'])
});

export type ShareVaultInput = z.infer<typeof shareVaultInputSchema>;

// Authentication schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  two_factor_token: z.string().optional()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const enable2FAInputSchema = z.object({
  user_id: z.number(),
  secret: z.string()
});

export type Enable2FAInput = z.infer<typeof enable2FAInputSchema>;

// Search schema
export const searchInputSchema = z.object({
  query: z.string(),
  vault_id: z.number().optional(),
  category_id: z.number().optional(),
  type: z.enum(['password', 'note', 'credit_card']).optional()
});

export type SearchInput = z.infer<typeof searchInputSchema>;

// Password generation schema
export const generatePasswordInputSchema = z.object({
  length: z.number().int().min(4).max(128).default(16),
  include_uppercase: z.boolean().default(true),
  include_lowercase: z.boolean().default(true),
  include_numbers: z.boolean().default(true),
  include_symbols: z.boolean().default(true),
  exclude_ambiguous: z.boolean().default(false)
});

export type GeneratePasswordInput = z.infer<typeof generatePasswordInputSchema>;

export const generatedPasswordSchema = z.object({
  password: z.string(),
  strength: z.enum(['weak', 'fair', 'good', 'strong', 'very_strong'])
});

export type GeneratedPassword = z.infer<typeof generatedPasswordSchema>;