import { createClient } from '@libsql/client';

if (!process.env.TURSO_DB_URL || !process.env.TURSO_DB_TOKEN) {
  console.warn('TURSO_DB_URL and TURSO_DB_TOKEN are not defined in environment variables. Database operations may fail if not running in production.');
}


export const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});
