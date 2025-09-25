import { migrate } from 'drizzle-orm/node-postgres/migrator';

import config from '~~/drizzle.config';

import { useDrizzle } from '../utils/db';

const db = useDrizzle();

await migrate(db, { migrationsFolder: config.out! });
