import { serial, text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for permission levels
export const permissionLevelEnum = pgEnum('permission_level', ['read', 'write', 'admin']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  two_factor_enabled: boolean('two_factor_enabled').notNull().default(false),
  two_factor_secret: text('two_factor_secret'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Vaults table
export const vaultsTable = pgTable('vaults', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  owner_id: integer('owner_id').notNull().references(() => usersTable.id),
  encryption_key: text('encryption_key').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  vault_id: integer('vault_id').notNull().references(() => vaultsTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Password entries table
export const passwordEntriesTable = pgTable('password_entries', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  username: text('username'), // Nullable by default
  encrypted_password: text('encrypted_password').notNull(),
  url: text('url'), // Nullable by default
  notes: text('notes'), // Nullable by default
  vault_id: integer('vault_id').notNull().references(() => vaultsTable.id),
  category_id: integer('category_id').references(() => categoriesTable.id), // Nullable by default
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Secure notes table
export const secureNotesTable = pgTable('secure_notes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  encrypted_content: text('encrypted_content').notNull(),
  vault_id: integer('vault_id').notNull().references(() => vaultsTable.id),
  category_id: integer('category_id').references(() => categoriesTable.id), // Nullable by default
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Credit cards table
export const creditCardsTable = pgTable('credit_cards', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  cardholder_name: text('cardholder_name').notNull(),
  encrypted_card_number: text('encrypted_card_number').notNull(),
  encrypted_cvv: text('encrypted_cvv').notNull(),
  expiry_month: integer('expiry_month').notNull(),
  expiry_year: integer('expiry_year').notNull(),
  vault_id: integer('vault_id').notNull().references(() => vaultsTable.id),
  category_id: integer('category_id').references(() => categoriesTable.id), // Nullable by default
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Vault sharing table
export const vaultSharingTable = pgTable('vault_sharing', {
  id: serial('id').primaryKey(),
  vault_id: integer('vault_id').notNull().references(() => vaultsTable.id),
  shared_with_user_id: integer('shared_with_user_id').notNull().references(() => usersTable.id),
  shared_by_user_id: integer('shared_by_user_id').notNull().references(() => usersTable.id),
  permission_level: permissionLevelEnum('permission_level').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  ownedVaults: many(vaultsTable),
  createdPasswordEntries: many(passwordEntriesTable),
  createdSecureNotes: many(secureNotesTable),
  createdCreditCards: many(creditCardsTable),
  sharedVaults: many(vaultSharingTable, { relationName: 'sharedWithUser' }),
  sharedByVaults: many(vaultSharingTable, { relationName: 'sharedByUser' }),
}));

export const vaultsRelations = relations(vaultsTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [vaultsTable.owner_id],
    references: [usersTable.id],
  }),
  categories: many(categoriesTable),
  passwordEntries: many(passwordEntriesTable),
  secureNotes: many(secureNotesTable),
  creditCards: many(creditCardsTable),
  sharing: many(vaultSharingTable),
}));

export const categoriesRelations = relations(categoriesTable, ({ one, many }) => ({
  vault: one(vaultsTable, {
    fields: [categoriesTable.vault_id],
    references: [vaultsTable.id],
  }),
  passwordEntries: many(passwordEntriesTable),
  secureNotes: many(secureNotesTable),
  creditCards: many(creditCardsTable),
}));

export const passwordEntriesRelations = relations(passwordEntriesTable, ({ one }) => ({
  vault: one(vaultsTable, {
    fields: [passwordEntriesTable.vault_id],
    references: [vaultsTable.id],
  }),
  category: one(categoriesTable, {
    fields: [passwordEntriesTable.category_id],
    references: [categoriesTable.id],
  }),
  creator: one(usersTable, {
    fields: [passwordEntriesTable.created_by],
    references: [usersTable.id],
  }),
}));

export const secureNotesRelations = relations(secureNotesTable, ({ one }) => ({
  vault: one(vaultsTable, {
    fields: [secureNotesTable.vault_id],
    references: [vaultsTable.id],
  }),
  category: one(categoriesTable, {
    fields: [secureNotesTable.category_id],
    references: [categoriesTable.id],
  }),
  creator: one(usersTable, {
    fields: [secureNotesTable.created_by],
    references: [usersTable.id],
  }),
}));

export const creditCardsRelations = relations(creditCardsTable, ({ one }) => ({
  vault: one(vaultsTable, {
    fields: [creditCardsTable.vault_id],
    references: [vaultsTable.id],
  }),
  category: one(categoriesTable, {
    fields: [creditCardsTable.category_id],
    references: [categoriesTable.id],
  }),
  creator: one(usersTable, {
    fields: [creditCardsTable.created_by],
    references: [usersTable.id],
  }),
}));

export const vaultSharingRelations = relations(vaultSharingTable, ({ one }) => ({
  vault: one(vaultsTable, {
    fields: [vaultSharingTable.vault_id],
    references: [vaultsTable.id],
  }),
  sharedWithUser: one(usersTable, {
    fields: [vaultSharingTable.shared_with_user_id],
    references: [usersTable.id],
    relationName: 'sharedWithUser',
  }),
  sharedByUser: one(usersTable, {
    fields: [vaultSharingTable.shared_by_user_id],
    references: [usersTable.id],
    relationName: 'sharedByUser',
  }),
}));

// TypeScript types for table operations
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Vault = typeof vaultsTable.$inferSelect;
export type NewVault = typeof vaultsTable.$inferInsert;
export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;
export type PasswordEntry = typeof passwordEntriesTable.$inferSelect;
export type NewPasswordEntry = typeof passwordEntriesTable.$inferInsert;
export type SecureNote = typeof secureNotesTable.$inferSelect;
export type NewSecureNote = typeof secureNotesTable.$inferInsert;
export type CreditCard = typeof creditCardsTable.$inferSelect;
export type NewCreditCard = typeof creditCardsTable.$inferInsert;
export type VaultSharing = typeof vaultSharingTable.$inferSelect;
export type NewVaultSharing = typeof vaultSharingTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  vaults: vaultsTable,
  categories: categoriesTable,
  passwordEntries: passwordEntriesTable,
  secureNotes: secureNotesTable,
  creditCards: creditCardsTable,
  vaultSharing: vaultSharingTable,
};