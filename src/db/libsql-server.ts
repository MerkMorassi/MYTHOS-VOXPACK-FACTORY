import { createClient } from '@libsql/client';

if (!process.env.TURSO_DB_URL || !process.env.TURSO_DB_TOKEN) {
  throw new Error('TURSO_DB_URL and TURSO_DB_TOKEN must be defined in environment variables');
}

export const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});
