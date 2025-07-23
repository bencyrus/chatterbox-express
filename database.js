import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database file path
const DB_PATH = path.join(__dirname, "cue.db");

// Initialize database connection
const { Database } = sqlite3.verbose();
const db = new Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

// Create tables
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Prompt table - stores logical prompts
      db.run(
        `create table if not exists prompt (
        prompt_id integer primary key autoincrement,
        type text not null check(type in ('main', 'followup')),
        created_at datetime default current_timestamp,
        updated_at datetime default current_timestamp
      )`,
        (err) => {
          if (err) console.error("Error creating prompt table:", err);
        }
      );

      // Translation table - stores text for each language
      db.run(
        `create table if not exists translation (
        translation_id integer primary key autoincrement,
        prompt_id integer not null,
        language_code text not null check(language_code in ('en', 'fr')),
        text text not null,
        created_at datetime default current_timestamp,
        updated_at datetime default current_timestamp,
        foreign key(prompt_id) references prompt(prompt_id),
        unique(prompt_id, language_code)
      )`,
        (err) => {
          if (err) console.error("Error creating translation table:", err);
        }
      );

      // Create indexes
      db.run(
        `create index if not exists idx_translation_language on translation(language_code)`
      );
      db.run(
        `create index if not exists idx_translation_prompt on translation(prompt_id)`
      );

      console.log("📋 Database tables initialized");
      resolve();
    });
  });
};

// Seed prompts data from JSON files
const seedPrompts = () => {
  return new Promise((resolve, reject) => {
    // Check if prompts already exist
    db.get("select count(*) as count from prompt", (err, row) => {
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
        // Load JSON data
        const enData = JSON.parse(
          fs.readFileSync(path.join(__dirname, "en_cue_cards.json"), "utf8")
        );
        const frData = JSON.parse(
          fs.readFileSync(path.join(__dirname, "fr_cue_cards.json"), "utf8")
        );

        let promptIdCounter = 1;

        // Process each card
        enData.forEach((card, cardIndex) => {
          const frCard = frData[cardIndex]; // Corresponding French card

          // Insert main prompt
          const mainPromptId = promptIdCounter++;
          db.run("insert into prompt (prompt_id, type) values (?, ?)", [
            mainPromptId,
            "main",
          ]);

          // Insert main prompt translations
          db.run(
            "insert into translation (prompt_id, language_code, text) values (?, ?, ?)",
            [mainPromptId, "en", card.main_prompt]
          );
          db.run(
            "insert into translation (prompt_id, language_code, text) values (?, ?, ?)",
            [mainPromptId, "fr", frCard.main_prompt]
          );

          // Insert followup prompts
          card.followups.forEach((followup, followupIndex) => {
            const followupPromptId = promptIdCounter++;
            db.run("insert into prompt (prompt_id, type) values (?, ?)", [
              followupPromptId,
              "followup",
            ]);

            // Insert followup translations
            db.run(
              "insert into translation (prompt_id, language_code, text) values (?, ?, ?)",
              [followupPromptId, "en", followup]
            );
            db.run(
              "insert into translation (prompt_id, language_code, text) values (?, ?, ?)",
              [followupPromptId, "fr", frCard.followups[followupIndex]]
            );
          });
        });

        console.log("💬 Prompts seeded successfully");
        resolve();
      } catch (error) {
        console.error("Error seeding prompts:", error);
        reject(error);
      }
    });
  });
};

// Initialize everything
const setupDatabase = async () => {
  try {
    await initializeDatabase();
    await seedPrompts();
    console.log("🗄️ Database setup complete!");
  } catch (error) {
    console.error("❌ Database setup failed:", error);
  }
};

export { db, setupDatabase };
