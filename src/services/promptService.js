/**
 * Prompt Service
 * Handles prompt retrieval and language-specific operations
 */

import databaseService from "./databaseService.js";

class PromptService {
  constructor() {
    this.supportedLanguages = ["en", "fr"];
    this.promptsPerSet = 5; // 1 main + 4 followups
  }

  /**
   * Check if language is supported
   * @param {string} language - Language code to check
   * @returns {boolean} Whether language is supported
   */
  isLanguageSupported(language) {
    return this.supportedLanguages.includes(language);
  }

  /**
   * Get all conversation prompts for a specific language
   * @param {string} language - Language code ('en' or 'fr')
   * @returns {Promise<Array>} Array of prompt sets
   */
  async getPromptsByLanguage(language) {
    if (!language) {
      throw new Error("Language parameter is required");
    }

    if (!this.isLanguageSupported(language)) {
      throw new Error(
        `Unsupported language. Supported languages: ${this.supportedLanguages.join(", ")}`
      );
    }

    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          p.prompt_id,
          p.type,
          t.text
        FROM prompt p
        JOIN translation t ON p.prompt_id = t.prompt_id
        WHERE t.language_code = ?
        ORDER BY p.prompt_id
      `;

      const db = databaseService.getDatabase();
      db.all(query, [language], (err, rows) => {
        if (err) {
          console.error("Database error fetching prompts:", err);
          reject(new Error("Database error fetching prompts"));
          return;
        }

        try {
          const promptSets = this.groupPromptsIntoSets(rows);
          resolve(promptSets);
        } catch (error) {
          reject(new Error(`Error processing prompts: ${error.message}`));
        }
      });
    });
  }

  /**
   * Group individual prompts into conversation sets
   * @param {Array} rows - Raw prompt data from database
   * @returns {Array} Array of prompt sets with main prompt and followups
   */
  groupPromptsIntoSets(rows) {
    const promptSets = [];
    let currentSet = null;

    rows.forEach((row) => {
      if (row.type === "main") {
        // Start new set
        currentSet = {
          id: Math.ceil(row.prompt_id / this.promptsPerSet), // Calculate set ID
          main_prompt: row.text,
          followups: [],
        };
        promptSets.push(currentSet);
      } else if (row.type === "followup" && currentSet) {
        // Add followup to current set
        currentSet.followups.push(row.text);
      }
    });

    return promptSets;
  }

  /**
   * Get prompt statistics
   * @returns {Promise<Object>} Statistics about prompts in the database
   */
  async getPromptStatistics() {
    return new Promise((resolve, reject) => {
      const queries = {
        totalPrompts: "SELECT COUNT(*) as count FROM prompt",
        mainPrompts: 'SELECT COUNT(*) as count FROM prompt WHERE type = "main"',
        followupPrompts:
          'SELECT COUNT(*) as count FROM prompt WHERE type = "followup"',
        totalTranslations: "SELECT COUNT(*) as count FROM translation",
        languageBreakdown: `
          SELECT 
            language_code, 
            COUNT(*) as count 
          FROM translation 
          GROUP BY language_code
        `,
      };

      const db = databaseService.getDatabase();
      const results = {};

      // Execute all queries
      const queryPromises = Object.entries(queries).map(([key, query]) => {
        return new Promise((resolveQuery, rejectQuery) => {
          if (key === "languageBreakdown") {
            db.all(query, [], (err, rows) => {
              if (err) {
                rejectQuery(err);
                return;
              }
              results[key] = rows;
              resolveQuery();
            });
          } else {
            db.get(query, [], (err, row) => {
              if (err) {
                rejectQuery(err);
                return;
              }
              results[key] = row.count;
              resolveQuery();
            });
          }
        });
      });

      Promise.all(queryPromises)
        .then(() => {
          resolve({
            totalPrompts: results.totalPrompts,
            mainPrompts: results.mainPrompts,
            followupPrompts: results.followupPrompts,
            totalTranslations: results.totalTranslations,
            promptSets: results.mainPrompts, // Each main prompt represents one set
            supportedLanguages: this.supportedLanguages,
            languageBreakdown: results.languageBreakdown,
          });
        })
        .catch((error) => {
          console.error("Database error fetching statistics:", error);
          reject(new Error("Database error fetching statistics"));
        });
    });
  }

  /**
   * Validate prompt set structure
   * @param {Array} promptSets - Array of prompt sets to validate
   * @returns {Object} Validation result with any issues found
   */
  validatePromptSets(promptSets) {
    const issues = [];

    promptSets.forEach((set, index) => {
      if (!set.main_prompt || set.main_prompt.trim() === "") {
        issues.push(`Set ${set.id || index + 1}: Missing main prompt`);
      }

      if (!Array.isArray(set.followups)) {
        issues.push(`Set ${set.id || index + 1}: Followups is not an array`);
      } else if (set.followups.length === 0) {
        issues.push(`Set ${set.id || index + 1}: No followup prompts`);
      } else {
        set.followups.forEach((followup, followupIndex) => {
          if (!followup || followup.trim() === "") {
            issues.push(
              `Set ${set.id || index + 1}: Empty followup ${followupIndex + 1}`
            );
          }
        });
      }
    });

    return {
      isValid: issues.length === 0,
      issues: issues,
      totalSets: promptSets.length,
    };
  }
}

// Create singleton instance
const promptService = new PromptService();

export default promptService;
