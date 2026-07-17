// Drizzle table definitions (TDD §7, M5 task 5.3).
// Mirrors AppDataContext shapes (src/context/AppDataContext.tsx) — metadata only,
// per PRIVACY INVARIANT (BE-5/SEC-2): never frames/video/landmarks.

import {
  pgTable,
  text,
  boolean,
  real,
  bigint,
  timestamp,
  uuid,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  clerkUserId: text('clerk_user_id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(), // 'deaf' | 'hearing' | 'interpreter'
  primaryLanguage: text('primary_language').notNull(), // SignLanguageCode
  plan: text('plan').notNull().default('Free plan'),
});

export const history = pgTable(
  'history',
  {
    // Client-generated id (Date.now()+rand) is authoritative — TDD §7.2
    // "client id; last-write-wins". POST upserts on (clerkUserId, id) so the
    // same entry syncing from multiple devices reconciles instead of
    // duplicating. Composite PK keeps ids per-user: one user can never
    // overwrite another's row by guessing an id.
    id: bigint('id', { mode: 'number' }).notNull(),
    clerkUserId: text('clerk_user_id')
      .notNull()
      .references(() => profiles.clerkUserId, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    type: text('type').notNull(), // TranslationMode
    conf: real('conf'),
    saved: boolean('saved').notNull().default(false),
    languageCode: text('language_code').notNull(), // SignLanguageCode
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(), // epoch ms, client-supplied
  },
  (table) => [primaryKey({ columns: [table.clerkUserId, table.id] })]
);

export const phrasebook = pgTable(
  'phrasebook',
  {
    clerkUserId: text('clerk_user_id')
      .notNull()
      .references(() => profiles.clerkUserId, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    phrase: text('phrase').notNull(),
  },
  (table) => [primaryKey({ columns: [table.clerkUserId, table.category, table.phrase] })]
);

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id')
    .notNull()
    .references(() => profiles.clerkUserId, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  letter: text('letter'),
  confidence: real('confidence'),
  language: text('language').notNull(), // SignLanguageCode
  appVersion: text('app_version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
