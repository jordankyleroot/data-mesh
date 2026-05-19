const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://datamesh:datamesh@localhost:5432/datamesh',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
