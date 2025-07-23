/**
 * Backup Controller
 * Handles database backup-related HTTP requests
 */

import emailService from "../services/emailService.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

/**
 * Send database backup via email
 * POST /api/v1/backup-db
 */
export const sendDatabaseBackup = asyncHandler(async (req, res) => {
  const { email } = req.body;

  console.log("📡 POST /api/v1/backup-db");

  // Validate email
  if (!email) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Email address is required",
      field: "email",
    });
  }

  // Check if email service is configured
  if (!emailService.isConfigured()) {
    return res.status(500).json({
      error: "Service unavailable",
      message: "Email service not configured",
    });
  }

  try {
    const result = await emailService.sendDatabaseBackup(email);

    res.json({
      success: true,
      message: "Database backup sent successfully",
      messageId: result.messageId,
      filename: result.filename,
      fileSize: `${(result.fileSize / 1024).toFixed(1)} KB`,
    });
  } catch (error) {
    console.error("Error sending backup:", error);
    res.status(500).json({
      error: "Failed to send database backup",
      message: error.message,
    });
  }
});

export default {
  sendDatabaseBackup,
};
