import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { members } from '../auth-schema';

export {
  account as accountTable,
  members as membersTable,
  session as sessionTable,
  verification as verificationTable,
} from '../auth-schema';

export const apiKeyTable = pgTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    start: text('start'),
    prefix: text('prefix'),
    key: text('key').notNull().unique(),
    memberRefID: text('member_ref_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),

    refillInterval: integer('refill_interval').default(86400000), // ms, 1 day
    refillAmount: integer('refill_amount').default(10),
    lastRefillAt: timestamp('last_refill_at'),

    enabled: boolean('enabled').default(true),
    rateLimitEnabled: boolean('rate_limit_enabled').default(true),
    rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000), // ms, 1 day
    rateLimitMax: integer('rate_limit_max').default(10),
    requestCount: integer('request_count').default(0),
    remaining: integer('remaining').default(10),
    lastRequest: timestamp('last_request'),

    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),

    permissions: integer('permissions').notNull().default(0),
    metadata: jsonb('metadata'),
  },
  (table) => [
    index('api_key_member_ref_id_idx').on(table.memberRefID),
    index('api_key_key_idx').on(table.key),
  ]
);
