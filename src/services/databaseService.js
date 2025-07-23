/**
 * Database Service
 * Handles all database operations with proper error handling and connection management
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createDatabaseConnection,
  schemas,
  indexes,
} from "../config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database connection and setup
   */
  async initialize() {
    if (this.isInitialized) {
      return this.db;
    }

    try {
      this.db = createDatabaseConnection();
      await this.createTables();
      await this.createIndexes();
      await this.seedInitialData();

      this.isInitialized = true;
      console.log("🗄️ Database service initialized successfully");
      return this.db;
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      throw error;
    }
  }

  /**
   * Create all database tables
   */
  createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        const tablePromises = Object.entries(schemas).map(
          ([tableName, schema]) => {
            return new Promise((resolveTable, rejectTable) => {
              this.db.run(schema, (err) => {
                if (err) {
                  console.error(`Error creating ${tableName} table:`, err);
                  rejectTable(err);
                } else {
                  resolveTable();
                }
              });
            });
          }
        );

        Promise.all(tablePromises)
          .then(() => {
            console.log("📋 Database tables created successfully");
            resolve();
          })
          .catch(reject);
      });
    });
  }

  /**
   * Create database indexes
   */
  createIndexes() {
    return new Promise((resolve, reject) => {
      const indexPromises = indexes.map((indexSQL) => {
        return new Promise((resolveIndex, rejectIndex) => {
          this.db.run(indexSQL, (err) => {
            if (err) {
              console.error("Error creating index:", err);
              rejectIndex(err);
            } else {
              resolveIndex();
            }
          });
        });
      });

      Promise.all(indexPromises)
        .then(() => {
          console.log("📇 Database indexes created successfully");
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Seed initial prompt data if not already present
   */
  async seedInitialData() {
    return new Promise((resolve, reject) => {
      // Check if prompts already exist
      this.db.get("SELECT COUNT(*) as count FROM prompt", (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count > 0) {
          console.log("💬 Prompts already seeded");
          resolve();
          return;
        }

        try {
          this.seedPrompts()
            .then(() => {
              console.log("💬 Initial data seeded successfully");
              resolve();
            })
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Seed prompts from JSON files
   */
  seedPrompts() {
    return new Promise((resolve, reject) => {
      try {
        // Load JSON data files
        const enDataPath = path.join(__dirname, "../../en_cue_cards.json");
        const frDataPath = path.join(__dirname, "../../fr_cue_cards.json");

        const enData = JSON.parse(fs.readFileSync(enDataPath, "utf8"));
        const frData = JSON.parse(fs.readFileSync(frDataPath, "utf8"));

        let promptIdCounter = 1;

        this.db.serialize(() => {
          // Process each card
          enData.forEach((card, cardIndex) => {
            const frCard = frData[cardIndex];

            // Insert main prompt
            const mainPromptId = promptIdCounter++;
            this.db.run("INSERT INTO prompt (prompt_id, type) VALUES (?, ?)", [
              mainPromptId,
              "main",
            ]);

            // Insert main prompt translations
            this.db.run(
              "INSERT INTO translation (prompt_id, language_code, text) VALUES (?, ?, ?)",
              [mainPromptId, "en", card.main_prompt]
            );
            this.db.run(
              "INSERT INTO translation (prompt_id, language_code, text) VALUES (?, ?, ?)",
              [mainPromptId, "fr", frCard.main_prompt]
            );

            // Insert followup prompts
            card.followups.forEach((followup, followupIndex) => {
              const followupPromptId = promptIdCounter++;
              this.db.run(
                "INSERT INTO prompt (prompt_id, type) VALUES (?, ?)",
                [followupPromptId, "followup"]
              );

              // Insert followup translations
              this.db.run(
                "INSERT INTO translation (prompt_id, language_code, text) VALUES (?, ?, ?)",
                [followupPromptId, "en", followup]
              );
              this.db.run(
                "INSERT INTO translation (prompt_id, language_code, text) VALUES (?, ?, ?)",
                [followupPromptId, "fr", frCard.followups[followupIndex]]
              );
            });
          });

          resolve();
        });
      } catch (error) {
        console.error("Error seeding prompts:", error);
        reject(error);
      }
    });
  }

  /**
   * Get database instance
   */
  getDatabase() {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error("Error closing database:", err);
            reject(err);
          } else {
            console.log("✅ Database connection closed");
            this.isInitialized = false;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;
