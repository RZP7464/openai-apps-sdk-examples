import { Pool } from "pg";
import config from "../config/index.js";

export const pool = new Pool(config.database);

// Test connection
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(-1);
});

export default pool;

