/**
 * Backup Routes
 * Handles database backup-related endpoints
 */

import express from "express";
import backupController from "../controllers/backupController.js";
import {
  validateBackupPassword,
  validateEmail,
} from "../middlewares/validation.js";
import { rateLimitPresets } from "../middlewares/rateLimit.js";

const router = express.Router();

/**
 * POST /api/v1/backup-db
 * Send database backup via email (password protected)
 */
router.post(
  "/backup-db",
  rateLimitPresets.backup, // Very strict rate limiting for backups
  validateBackupPassword, // Validate backup password
  validateEmail, // Validate email format
  backupController.sendDatabaseBackup
);

export default router;
