/**
 * Prompt Controller
 * Handles prompt-related HTTP requests
 */

import promptService from "../services/promptService.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

/**
 * Get conversation prompts for a specific language
 * GET /api/v1/prompts?language=en|fr
 */
export const getPrompts = asyncHandler(async (req, res) => {
  const { language } = req.query;

  console.log(`📡 GET /api/v1/prompts?language=${language}`);

  try {
    const promptSets = await promptService.getPromptsByLanguage(language);

    res.json(promptSets);
  } catch (error) {
    console.error("Error fetching prompts:", error);
    res.status(500).json({
      error: "Failed to fetch prompts",
      message: error.message,
    });
  }
});

/**
 * Get prompt statistics (for admin/debugging purposes)
 * GET /api/v1/prompts/stats
 */
export const getPromptStatistics = asyncHandler(async (req, res) => {
  console.log(`📡 GET /api/v1/prompts/stats`);

  try {
    const statistics = await promptService.getPromptStatistics();

    res.json({
      success: true,
      data: statistics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching prompt statistics:", error);
    res.status(500).json({
      error: "Failed to fetch statistics",
      message: error.message,
    });
  }
});

/**
 * Validate prompt structure (for debugging purposes)
 * POST /api/v1/prompts/validate
 */
export const validatePrompts = asyncHandler(async (req, res) => {
  const { language } = req.body;

  console.log(
    `📡 POST /api/v1/prompts/validate for language: ${language || "all"}`
  );

  try {
    let validationResults = {};

    if (language) {
      // Validate specific language
      if (!promptService.isLanguageSupported(language)) {
        return res.status(400).json({
          error: "Unsupported language",
          message: `Language '${language}' is not supported`,
        });
      }

      const promptSets = await promptService.getPromptsByLanguage(language);
      validationResults[language] =
        promptService.validatePromptSets(promptSets);
    } else {
      // Validate all supported languages
      for (const lang of promptService.supportedLanguages) {
        const promptSets = await promptService.getPromptsByLanguage(lang);
        validationResults[lang] = promptService.validatePromptSets(promptSets);
      }
    }

    res.json({
      success: true,
      validation: validationResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error validating prompts:", error);
    res.status(500).json({
      error: "Failed to validate prompts",
      message: error.message,
    });
  }
});

export default {
  getPrompts,
  getPromptStatistics,
  validatePrompts,
};
