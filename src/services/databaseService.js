/**
 * Database Service
 * Handles PostgreSQL database operations with connection pooling
 */

import { createDatabaseConnection } from "../config/database.js";
import MigrationService from "./migrationService.js";

class DatabaseService {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize() {
    if (this.isInitialized) {
      return this.pool;
    }

    try {
      this.pool = createDatabaseConnection();

      // test connection
      const client = await this.pool.connect();
      try {
        await client.query("select now()");
        console.log("✅ connected to postgresql database");
      } finally {
        client.release();
      }

      // run migrations
      const migrationService = new MigrationService(this.pool);
      await migrationService.runMigrations();

      this.isInitialized = true;
      console.log("🗄️ database service initialized successfully");
      return this.pool;
    } catch (error) {
      console.error("❌ database initialization failed:", error);
      throw error;
    }
  }

  /**
   * Get database pool
   */
  getPool() {
    if (!this.isInitialized || !this.pool) {
      throw new Error("database not initialized. call initialize() first.");
    }
    return this.pool;
  }

  /**
   * Close database connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log("✅ database connection pool closed");
      this.isInitialized = false;
    }
  }
}

// create singleton instance
const databaseService = new DatabaseService();

export default databaseService;
