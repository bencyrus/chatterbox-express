/**
 * Database Configuration
 * PostgreSQL database connection and setup
 */

import pg from "pg";
import config from "./environment.js";

const { Pool } = pg;

/**
 * Create database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
export function createDatabaseConnection() {
  if (!config.postgresUrl) {
    throw new Error("CHATTERBOX_POSTGRES_URL environment variable is required");
  }

  const pool = new Pool({
    connectionString: config.postgresUrl,
    ssl:
      config.nodeEnv === "production" ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on("error", (err) => {
    console.error("❌ Unexpected error on idle client", err);
    process.exit(-1);
  });

  return pool;
}

export default {
  createDatabaseConnection,
};
