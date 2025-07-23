/**
 * Prompt Service
 * Handles prompt retrieval and language-specific operations
 */

import databaseService from "./databaseService.js";

class PromptService {
  constructor() {
    this.supportedLanguages = ["en", "fr"];
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
      throw new Error("language parameter is required");
    }

    if (!this.isLanguageSupported(language)) {
      throw new Error(
        `unsupported language. supported languages: ${this.supportedLanguages.join(", ")}`
      );
    }

    const pool = databaseService.getPool();
    const client = await pool.connect();

    try {
      const query = `
        select 
          p.promptid,
          p.type,
          p.prompt_set_id,
          p.position,
          t.text
        from prompts p
        join translations t on p.promptid = t.promptid
        where t.language_code = $1
        order by p.prompt_set_id, p.position
      `;

      const result = await client.query(query, [language]);
      const promptSets = this.groupPromptsIntoSets(result.rows);
      return promptSets;
    } catch (error) {
      console.error("database error fetching prompts:", error);
      throw new Error("database error fetching prompts");
    } finally {
      client.release();
    }
  }

  /**
   * Group individual prompts into conversation sets
   * @param {Array} rows - Raw prompt data from database
   * @returns {Array} Array of prompt sets with main prompt and followups
   */
  groupPromptsIntoSets(rows) {
    const promptSets = [];
    const setMap = new Map();

    rows.forEach((row) => {
      const setId = row.prompt_set_id;

      // Initialize set if it doesn't exist
      if (!setMap.has(setId)) {
        setMap.set(setId, {
          id: setId,
          main_prompt: "",
          followups: [],
        });
      }

      const promptSet = setMap.get(setId);

      if (row.type === "main") {
        promptSet.main_prompt = row.text;
      } else if (row.type === "followup") {
        // Insert followup at the correct position (position - 1 since main is position 0)
        const followupIndex = row.position - 1;
        promptSet.followups[followupIndex] = row.text;
      }
    });

    // Convert map to array and filter out any incomplete sets
    for (const promptSet of setMap.values()) {
      if (promptSet.main_prompt) {
        // Remove any undefined elements from followups array
        promptSet.followups = promptSet.followups.filter(
          (followup) => followup !== undefined
        );
        promptSets.push(promptSet);
      }
    }

    // Sort by set ID for consistent ordering
    promptSets.sort((a, b) => a.id - b.id);

    return promptSets;
  }

  /**
   * Get prompt statistics
   * @returns {Promise<Object>} Statistics about prompts in the database
   */
  async getPromptStatistics() {
    const pool = databaseService.getPool();
    const client = await pool.connect();

    try {
      const queries = {
        totalPrompts: "select count(*) as count from prompts",
        mainPrompts:
          "select count(*) as count from prompts where type = 'main'",
        followupPrompts:
          "select count(*) as count from prompts where type = 'followup'",
        totalTranslations: "select count(*) as count from translations",
        languageBreakdown: `
          select 
            language_code, 
            count(*) as count 
          from translations 
          group by language_code
        `,
      };

      const results = {};

      // execute individual queries
      for (const [key, query] of Object.entries(queries)) {
        if (key === "languageBreakdown") {
          const result = await client.query(query);
          results[key] = result.rows;
        } else {
          const result = await client.query(query);
          results[key] = parseInt(result.rows[0].count);
        }
      }

      return {
        totalPrompts: results.totalPrompts,
        mainPrompts: results.mainPrompts,
        followupPrompts: results.followupPrompts,
        totalTranslations: results.totalTranslations,
        promptSets: results.mainPrompts, // each main prompt represents one set
        supportedLanguages: this.supportedLanguages,
        languageBreakdown: results.languageBreakdown,
      };
    } catch (error) {
      console.error("database error fetching statistics:", error);
      throw new Error("database error fetching statistics");
    } finally {
      client.release();
    }
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
        issues.push(`set ${set.id || index + 1}: missing main prompt`);
      }

      if (!Array.isArray(set.followups)) {
        issues.push(`set ${set.id || index + 1}: followups is not an array`);
      } else if (set.followups.length === 0) {
        issues.push(`set ${set.id || index + 1}: no followup prompts`);
      } else {
        set.followups.forEach((followup, followupIndex) => {
          if (!followup || followup.trim() === "") {
            issues.push(
              `set ${set.id || index + 1}: empty followup ${followupIndex + 1}`
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

// create singleton instance
const promptService = new PromptService();

export default promptService;
