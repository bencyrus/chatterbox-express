/**
 * Database Configuration
 * SQLite database connection and setup
 */

import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database file path (in root directory for now to maintain existing data)
const DB_PATH = path.join(__dirname, "../../chatterbox.db");

/**
 * Initialize database connection
 * @returns {sqlite3.Database} Database instance
 */
export function createDatabaseConnection() {
  const { Database } = sqlite3.verbose();

  const db = new Database(DB_PATH, (err) => {
    if (err) {
      console.error("❌ Error opening database:", err.message);
      throw err;
    } else {
      console.log("✅ Connected to SQLite database");
    }
  });

  return db;
}

/**
 * Database schema definitions
 */
export const schemas = {
  prompt: `
    CREATE TABLE IF NOT EXISTS prompt (
      prompt_id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('main', 'followup')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  translation: `
    CREATE TABLE IF NOT EXISTS translation (
      translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      language_code TEXT NOT NULL CHECK(language_code IN ('en', 'fr')),
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(prompt_id) REFERENCES prompt(prompt_id),
      UNIQUE(prompt_id, language_code)
    )
  `,

  account: `
    CREATE TABLE IF NOT EXISTS account (
      account_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME,
      is_active BOOLEAN DEFAULT 1
    )
  `,

  loginAttempt: `
    CREATE TABLE IF NOT EXISTS login_attempt (
      attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_used BOOLEAN DEFAULT 0
    )
  `,
};

/**
 * Index definitions for optimization
 */
export const indexes = [
  "CREATE INDEX IF NOT EXISTS idx_translation_language ON translation(language_code)",
  "CREATE INDEX IF NOT EXISTS idx_translation_prompt ON translation(prompt_id)",
  "CREATE INDEX IF NOT EXISTS idx_account_email ON account(email)",
  "CREATE INDEX IF NOT EXISTS idx_attempt_email ON login_attempt(email)",
  "CREATE INDEX IF NOT EXISTS idx_attempt_code ON login_attempt(code)",
];

export default {
  createDatabaseConnection,
  schemas,
  indexes,
  DB_PATH,
};
