const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // --- IMPORTANT: Add SSL configuration for Render PostgreSQL ---
  ssl: {
    rejectUnauthorized: false // Required for Render's default SSL setup
  }
  // --- END SSL CONFIG ---
});

pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL database!');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
  process.exit(-1); // Exit process if there's a critical database error
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Export the pool directly if needed for more advanced operations
};
