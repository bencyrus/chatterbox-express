/**
 * Email Service
 * Handles email sending via Resend API with proper error handling and templates
 */

import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config/environment.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class EmailService {
  constructor() {
    this.resend = null;
    this.fromEmail = "clue@glovee.io"; // Your verified domain
  }

  /**
   * Initialize Resend client (lazy loading)
   */
  getResendClient() {
    if (!this.resend) {
      if (!config.resendApiKey) {
        throw new Error("Resend API key not configured");
      }
      this.resend = new Resend(config.resendApiKey);
    }
    return this.resend;
  }

  /**
   * Validate email service configuration
   */
  isConfigured() {
    return !!config.resendApiKey;
  }

  /**
   * Send login code email
   * @param {string} toEmail - Recipient email address
   * @param {string} loginCode - 6-digit login code
   * @returns {Promise<Object>} Email send result
   */
  async sendLoginCode(toEmail, loginCode) {
    try {
      if (!this.isConfigured()) {
        throw new Error(
          "Email service not configured - missing RESEND_API_KEY"
        );
      }

      const result = await this.getResendClient().emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: "Your Chatterbox login code",
        html: this.generateLoginCodeHTML(loginCode),
        text: this.generateLoginCodeText(loginCode),
      });

      return {
        success: true,
        messageId: result.data?.id,
        error: result.error || null,
      };
    } catch (error) {
      console.error("❌ Error sending login code:", error);
      throw new Error(`Failed to send login code: ${error.message}`);
    }
  }

  /**
   * Send database backup email
   * @param {string} toEmail - Recipient email address
   * @returns {Promise<Object>} Email send result with attachment info
   */
  async sendDatabaseBackup(toEmail) {
    try {
      if (!this.isConfigured()) {
        throw new Error(
          "Email service not configured - missing RESEND_API_KEY"
        );
      }

      const dbPath = path.join(__dirname, "../../chatterbox.db");

      // Check if database file exists
      if (!fs.existsSync(dbPath)) {
        throw new Error("Database file not found");
      }

      // Read database file
      const dbBuffer = fs.readFileSync(dbPath);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const filename = `chatterbox-backup-${timestamp}.db`;

      const result = await this.getResendClient().emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `Chatterbox Database Backup - ${timestamp}`,
        html: this.generateBackupHTML(timestamp, dbBuffer.length),
        attachments: [
          {
            filename: filename,
            content: dbBuffer,
          },
        ],
      });

      return {
        success: true,
        messageId: result.data?.id,
        filename: filename,
        fileSize: dbBuffer.length,
        error: result.error || null,
      };
    } catch (error) {
      console.error("❌ Error sending database backup:", error);
      throw new Error(`Failed to send database backup: ${error.message}`);
    }
  }

  /**
   * Generate HTML template for login code email
   * @param {string} loginCode - 6-digit login code
   * @returns {string} HTML content
   */
  generateLoginCodeHTML(loginCode) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">🎯 Chatterbox Login</h2>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 36px; margin: 0; color: #007AFF; letter-spacing: 8px; font-family: monospace;">
            ${loginCode}
          </h1>
        </div>
        <p style="color: #666; text-align: center; margin: 20px 0;">
          Enter this code in your Chatterbox app to complete your login.
        </p>
        <p style="color: #999; text-align: center; font-size: 14px;">
          This code will expire in 10 minutes for your security.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; text-align: center; font-size: 12px;">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
    `;
  }

  /**
   * Generate plain text template for login code email
   * @param {string} loginCode - 6-digit login code
   * @returns {string} Plain text content
   */
  generateLoginCodeText(loginCode) {
    return `Your Chatterbox login code is: ${loginCode}

Enter this code in your Chatterbox app to complete your login.

This code will expire in 10 minutes for your security.

If you didn't request this code, you can safely ignore this email.`;
  }

  /**
   * Generate HTML template for database backup email
   * @param {string} timestamp - Backup timestamp
   * @param {number} fileSize - File size in bytes
   * @returns {string} HTML content
   */
  generateBackupHTML(timestamp, fileSize) {
    return `
      <h2>Chatterbox Database Backup</h2>
      <p>Hi there! 👋</p>
      <p>Here's your scheduled database backup for <strong>${timestamp}</strong>.</p>
      <p>The attached file contains all your prompts and translations data.</p>
      <p>File size: ${(fileSize / 1024).toFixed(1)} KB</p>
      <hr>
      <p><small>This is an automated backup from your Chatterbox Express API.</small></p>
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;
