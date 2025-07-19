const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database!');
});

pool.on('error', (err) => {
  console.error('Error connecting to PostgreSQL:', err.message, err.stack);
  process.exit(1); // Exit process if database connection fails
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Export pool for direct access if needed
};
