/**
 * Migration Service
 * Simple migration system for PostgreSQL - runs SQL files in order
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MigrationService {
  constructor(pool) {
    this.pool = pool;
    this.migrationsPath = path.join(__dirname, "../../migrations");
  }

  /**
   * Ensure migrations table exists
   */
  async ensureMigrationsTable() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        create table if not exists migrations (
          migrationid serial primary key,
          filename text not null unique,
          applied_at timestamp default current_timestamp
        )
      `);
      console.log("✅ migrations table ready");
    } finally {
      client.release();
    }
  }

  /**
   * Get list of already applied migrations
   */
  async getAppliedMigrations() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        "select filename from migrations order by filename"
      );
      return result.rows.map((row) => row.filename);
    } finally {
      client.release();
    }
  }

  /**
   * Get list of migration files that need to be run
   */
  async getPendingMigrations() {
    const appliedMigrations = await this.getAppliedMigrations();

    if (!fs.existsSync(this.migrationsPath)) {
      console.log("📁 no migrations folder found");
      return [];
    }

    const files = fs
      .readdirSync(this.migrationsPath)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    return files.filter((file) => !appliedMigrations.includes(file));
  }

  /**
   * Run a single migration file
   */
  async runMigration(filename) {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filePath, "utf8");

    const client = await this.pool.connect();
    try {
      await client.query("begin");

      // run the migration sql
      await client.query(sql);

      // record that this migration was applied
      await client.query("insert into migrations (filename) values ($1)", [
        filename,
      ]);

      await client.query("commit");
      console.log(`✅ applied migration: ${filename}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(
        `❌ failed to apply migration ${filename}: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    console.log("🔄 checking for pending migrations...");

    await this.ensureMigrationsTable();
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log("✅ no pending migrations");
      return;
    }

    console.log(`📋 found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    console.log("✅ all migrations applied successfully");
  }
}

export default MigrationService;
