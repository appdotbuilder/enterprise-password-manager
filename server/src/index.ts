import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createUserInputSchema,
  loginInputSchema,
  enable2FAInputSchema,
  createVaultInputSchema,
  createCategoryInputSchema,
  createPasswordEntryInputSchema,
  createSecureNoteInputSchema,
  createCreditCardInputSchema,
  shareVaultInputSchema,
  searchInputSchema,
  generatePasswordInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { authenticateUser } from './handlers/authenticate_user';
import { enable2FA } from './handlers/enable_2fa';
import { createVault } from './handlers/create_vault';
import { getUserVaults } from './handlers/get_user_vaults';
import { createCategory } from './handlers/create_category';
import { getVaultCategories } from './handlers/get_vault_categories';
import { createPasswordEntry } from './handlers/create_password_entry';
import { createSecureNote } from './handlers/create_secure_note';
import { createCreditCard } from './handlers/create_credit_card';
import { getVaultItems } from './handlers/get_vault_items';
import { shareVault } from './handlers/share_vault';
import { getVaultSharing } from './handlers/get_vault_sharing';
import { searchItems } from './handlers/search_items';
import { generatePassword } from './handlers/generate_password';
import { getUserByEmail } from './handlers/get_user_by_email';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  authenticateUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => authenticateUser(input)),

  enable2FA: publicProcedure
    .input(enable2FAInputSchema)
    .mutation(({ input }) => enable2FA(input)),

  getUserByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(({ input }) => getUserByEmail(input.email)),

  // Vault management routes
  createVault: publicProcedure
    .input(createVaultInputSchema)
    .mutation(({ input }) => createVault(input)),

  getUserVaults: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserVaults(input.userId)),

  shareVault: publicProcedure
    .input(shareVaultInputSchema)
    .mutation(({ input }) => shareVault(input)),

  getVaultSharing: publicProcedure
    .input(z.object({ vaultId: z.number() }))
    .query(({ input }) => getVaultSharing(input.vaultId)),

  // Category management routes
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getVaultCategories: publicProcedure
    .input(z.object({ vaultId: z.number() }))
    .query(({ input }) => getVaultCategories(input.vaultId)),

  // Password entry routes
  createPasswordEntry: publicProcedure
    .input(createPasswordEntryInputSchema)
    .mutation(({ input }) => createPasswordEntry(input)),

  // Secure note routes
  createSecureNote: publicProcedure
    .input(createSecureNoteInputSchema)
    .mutation(({ input }) => createSecureNote(input)),

  // Credit card routes
  createCreditCard: publicProcedure
    .input(createCreditCardInputSchema)
    .mutation(({ input }) => createCreditCard(input)),

  // Get vault items (passwords, notes, credit cards)
  getVaultItems: publicProcedure
    .input(z.object({ 
      vaultId: z.number(),
      categoryId: z.number().optional()
    }))
    .query(({ input }) => getVaultItems(input.vaultId, input.categoryId)),

  // Search functionality
  searchItems: publicProcedure
    .input(searchInputSchema)
    .query(({ input }) => searchItems(input)),

  // Password generation
  generatePassword: publicProcedure
    .input(generatePasswordInputSchema)
    .mutation(({ input }) => generatePassword(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Password Manager TRPC server listening at port: ${port}`);
  console.log('Available routes:');
  console.log('- createUser: Create new user account');
  console.log('- authenticateUser: Login with email/password/2FA');
  console.log('- enable2FA: Enable two-factor authentication');
  console.log('- getUserByEmail: Find user by email');
  console.log('- createVault: Create encrypted vault');
  console.log('- getUserVaults: Get user\'s vaults');
  console.log('- shareVault: Share vault with team members');
  console.log('- getVaultSharing: Get vault sharing info');
  console.log('- createCategory: Create item category');
  console.log('- getVaultCategories: Get vault categories');
  console.log('- createPasswordEntry: Store encrypted password');
  console.log('- createSecureNote: Store encrypted note');
  console.log('- createCreditCard: Store encrypted credit card');
  console.log('- getVaultItems: Get all vault items');
  console.log('- searchItems: Search across all items');
  console.log('- generatePassword: Generate strong password');
}

start();