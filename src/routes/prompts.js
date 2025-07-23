/**
 * Prompt Routes
 * Handles all prompt-related endpoints
 */

import express from "express";
import promptController from "../controllers/promptController.js";
import { validateLanguage } from "../middlewares/validation.js";
import { rateLimitPresets } from "../middlewares/rateLimit.js";
import { authenticateJWT } from "../middlewares/auth.js";

const router = express.Router();

/**
 * GET /api/v1/prompts?language=en|fr
 * Get conversation prompts for a specific language
 */
router.get(
  "/",
  rateLimitPresets.prompts, // Lenient rate limiting for prompts
  validateLanguage, // Validate language parameter
  promptController.getPrompts
);

/**
 * GET /api/v1/prompts/stats
 * Get prompt statistics (admin/debugging)
 */
router.get(
  "/stats",
  rateLimitPresets.api, // Standard API rate limiting
  authenticateJWT, // Require authentication for stats
  promptController.getPromptStatistics
);

/**
 * POST /api/v1/prompts/validate
 * Validate prompt structure (debugging)
 */
router.post(
  "/validate",
  rateLimitPresets.api, // Standard API rate limiting
  authenticateJWT, // Require authentication for validation
  promptController.validatePrompts
);

export default router;
