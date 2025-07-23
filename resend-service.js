import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lazy initialize Resend (only when needed)
let resend = null;
const getResend = () => {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

/**
 * Send database file via email
 * @param {string} toEmail - Recipient email address
 * @returns {Promise<Object>} - Resend response
 */
export const sendDatabaseBackup = async (toEmail) => {
  try {
    const dbPath = path.join(__dirname, "cue.db");

    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      throw new Error("Database file not found");
    }

    // Read database file
    const dbBuffer = fs.readFileSync(dbPath);

    // Get current date for filename
    const now = new Date();
    const timestamp = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `cue-backup-${timestamp}.db`;

    // Send email with database attachment
    const result = await getResend().emails.send({
      from: "clue@glovee.io", // Using your verified domain
      to: [toEmail],
      subject: `Cue Database Backup - ${timestamp}`,
      html: `
        <h2>Cue Database Backup</h2>
        <p>Hi there! 👋</p>
        <p>Here's your scheduled database backup for <strong>${timestamp}</strong>.</p>
        <p>The attached file contains all your prompts and translations data.</p>
        <p>File size: ${(dbBuffer.length / 1024).toFixed(1)} KB</p>
        <hr>
        <p><small>This is an automated backup from your Cue backend API.</small></p>
      `,
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
    };
  } catch (error) {
    console.error("❌ Error sending database backup:", error);
    throw error;
  }
};

/**
 * Validate Resend API key
 * @returns {boolean} - Whether the API key is configured
 */
export const validateResendConfig = () => {
  return !!process.env.RESEND_API_KEY;
};
