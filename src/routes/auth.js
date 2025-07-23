/**
 * Authentication Routes
 * Handles all authentication-related endpoints
 */

import express from "express";
import authController from "../controllers/authController.js";
import { authenticateJWT } from "../middlewares/auth.js";
import { validateEmail, validateLoginCode } from "../middlewares/validation.js";
import { rateLimitPresets } from "../middlewares/rateLimit.js";

const router = express.Router();

/**
 * POST /api/v1/auth/request-login
 * Send login code via email
 */
router.post(
  "/request-login",
  rateLimitPresets.auth, // Strict rate limiting for auth
  validateEmail, // Validate email format
  authController.requestLogin
);

/**
 * POST /api/v1/auth/verify-login
 * Verify login code and get JWT token
 */
router.post(
  "/verify-login",
  rateLimitPresets.auth, // Strict rate limiting for auth
  validateEmail, // Validate email format
  validateLoginCode, // Validate login code format
  authController.verifyLogin
);

/**
 * GET /api/v1/auth/verify
 * Verify JWT token and get user info
 */
router.get(
  "/verify",
  authenticateJWT, // Require authentication
  authController.verifyToken
);

/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token deletion)
 */
router.post(
  "/logout",
  authenticateJWT, // Require authentication
  authController.logout
);

export default router;
