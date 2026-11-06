
import dotenv from 'dotenv';
dotenv.config();
import { db } from './libsql-server';

async function setupDatabase() {
  try {
    console.log('Creating lore table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS lore (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    console.log('Lore table created successfully.');
  } catch (error) {
    console.error('Failed to create lore table:', error);
  }
}

setupDatabase();
