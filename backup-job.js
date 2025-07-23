/**
 * Database Backup Job
 * Sends database backup via email by calling the API endpoint
 * Designed to run as a Google Cloud Run job on schedule
 */

import https from "https";
import http from "http";

// Configuration from environment variables
const config = {
  apiUrl: process.env.API_URL || "http://localhost:3000",
  backupEmail: process.env.BACKUP_EMAIL,
  password: process.env.DB_SEND_PASSWORD,
  timeout: parseInt(process.env.TIMEOUT || "30000"), // 30 seconds default
  maxRetries: parseInt(process.env.MAX_RETRIES || "3"), // Maximum retry attempts
  baseDelayMs: parseInt(process.env.BASE_DELAY_MS || "60000"), // Base delay: 1 minute
};

/**
 * Validate required environment variables
 */
function validateConfig() {
  const missing = [];

  if (!config.backupEmail) missing.push("BACKUP_EMAIL");
  if (!config.password) missing.push("DB_SEND_PASSWORD");

  if (missing.length > 0) {
    console.error(
      "❌ Missing required environment variables:",
      missing.join(", ")
    );
    process.exit(1);
  }
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, baseDelay) {
  // Exponential backoff: baseDelay * 2^attempt with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // Add up to 10% jitter
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Make HTTP/HTTPS request
 * @param {string} url - Full URL to request
 * @param {Object} options - Request options
 * @param {string} data - POST data
 * @returns {Promise} Request promise
 */
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;

    const req = client.request(url, options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.setTimeout(config.timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${config.timeout}ms`));
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

/**
 * Send database backup via API with retry logic
 */
async function sendBackupWithRetry() {
  const timestamp = new Date().toISOString();
  console.log(`🕒 [${timestamp}] Starting database backup job`);
  console.log(`📧 Backup email: ${config.backupEmail}`);
  console.log(`🌐 API URL: ${config.apiUrl}`);
  console.log(`🔄 Max retries: ${config.maxRetries}`);

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`\n🎯 Attempt ${attempt + 1}/${config.maxRetries + 1}`);

      const backupUrl = `${config.apiUrl}/api/v1/backup-db`;
      const postData = JSON.stringify({
        email: config.backupEmail,
        password: config.password,
      });

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          "User-Agent": "CueBackupJob/1.0",
        },
      };

      console.log(`📡 Making backup request to: ${backupUrl}`);

      const response = await makeRequest(backupUrl, options, postData);

      if (response.statusCode === 200) {
        console.log("✅ Backup sent successfully!");
        console.log("📄 Response:", JSON.stringify(response.data, null, 2));
        return; // Success! Exit the function
      } else if (response.statusCode === 429) {
        // Rate limit exceeded
        console.warn(`⚠️  Rate limit exceeded (attempt ${attempt + 1})`);
        console.warn(
          "📄 Error response:",
          JSON.stringify(response.data, null, 2)
        );

        if (attempt < config.maxRetries) {
          const delay = calculateBackoffDelay(attempt, config.baseDelayMs);
          const delaySeconds = Math.floor(delay / 1000);
          console.log(`⏳ Waiting ${delaySeconds} seconds before retry...`);
          await sleep(delay);
        } else {
          console.error("❌ All retry attempts exhausted due to rate limiting");
          console.error(
            "💡 The API allows only 3 backup requests per hour. Please try again later."
          );
          process.exit(0); // Exit gracefully to prevent restart loop
        }
      } else {
        // Other HTTP error
        console.error(
          `❌ Backup failed with status ${response.statusCode} (attempt ${attempt + 1})`
        );
        console.error(
          "📄 Error response:",
          JSON.stringify(response.data, null, 2)
        );

        if (attempt < config.maxRetries) {
          const delay = calculateBackoffDelay(attempt, config.baseDelayMs);
          const delaySeconds = Math.floor(delay / 1000);
          console.log(`⏳ Waiting ${delaySeconds} seconds before retry...`);
          await sleep(delay);
        } else {
          console.error("❌ All retry attempts exhausted");
          process.exit(1);
        }
      }
    } catch (error) {
      console.error(
        `💥 Backup job failed on attempt ${attempt + 1}:`,
        error.message
      );

      if (attempt < config.maxRetries) {
        const delay = calculateBackoffDelay(attempt, config.baseDelayMs);
        const delaySeconds = Math.floor(delay / 1000);
        console.log(`⏳ Waiting ${delaySeconds} seconds before retry...`);
        await sleep(delay);
      } else {
        console.error("❌ All retry attempts exhausted due to errors");
        console.error("🔍 Stack trace:", error.stack);
        process.exit(1);
      }
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("🎯 Cue Database Backup Job Starting...");

  // Validate configuration
  validateConfig();

  // Send backup with retry logic
  await sendBackupWithRetry();

  console.log("🎉 Backup job completed successfully!");
  process.exit(0);
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection:", reason);
  process.exit(1);
});

// Run the job
main();
