
import { db } from './libsql-server';

async function testConnection() {
  try {
    console.log('Testing Turso DB connection...');
    const result = await db.execute('SELECT 1 as connected');
    console.log('Successfully connected to Turso DB!', result.rows[0]);
  } catch (error) {
    console.error('Failed to connect to Turso DB:', error);
  }
}

testConnection();
