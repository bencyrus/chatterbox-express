import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db, setupDatabase } from "./database.js";
import { sendDatabaseBackup, validateResendConfig } from "./resend-service.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on startup
setupDatabase();

// 🌐 API ENDPOINTS

// GET /api/v1/prompts - Fetch conversation prompts for a specific language
app.get("/api/v1/prompts", (req, res) => {
  const language = req.query.language;
  console.log(`📡 GET /api/v1/prompts?language=${language}`);

  if (!language) {
    return res.status(400).json({ error: "Language parameter is required" });
  }

  if (language !== "en" && language !== "fr") {
    return res
      .status(400)
      .json({ error: 'Unsupported language. Use "en" or "fr"' });
  }

  // Get all prompts with their translations for the specified language
  const query = `
    select 
      p.prompt_id,
      p.type,
      t.text
    from prompt p
    join translation t on p.prompt_id = t.prompt_id
    where t.language_code = ?
    order by p.prompt_id
  `;

  db.all(query, [language], (err, rows) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Group prompts by sets (every 5 prompts = 1 main + 4 followups)
    const promptSets = [];
    let currentSet = null;

    rows.forEach((row) => {
      if (row.type === "main") {
        // Start new set
        currentSet = {
          id: Math.ceil(row.prompt_id / 5), // Calculate set ID
          main_prompt: row.text,
          followups: [],
        };
        promptSets.push(currentSet);
      } else if (row.type === "followup" && currentSet) {
        // Add followup to current set
        currentSet.followups.push(row.text);
      }
    });

    res.json(promptSets);
  });
});

// POST /api/v1/backup-db - Send database backup via email (password protected)
app.post("/api/v1/backup-db", async (req, res) => {
  const { password, email } = req.body;
  console.log("📡 POST /api/v1/backup-db");

  // Validate password
  if (!password || password !== process.env.DB_SEND_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  // Validate email
  if (!email) {
    return res.status(400).json({ error: "Email address is required" });
  }

  // Check if Resend is configured
  if (!validateResendConfig()) {
    return res.status(500).json({ error: "Email service not configured" });
  }

  try {
    const result = await sendDatabaseBackup(email);

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
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Cue Backend API is running" });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🎯 Cue Backend API",
    version: "1.0.0",
    endpoints: ["GET /api/v1/prompts?language=en|fr", "POST /api/v1/backup-db"],
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Cue Backend API is running on port ${PORT}`);
  console.log(`📱 Update your iOS app to use: http://localhost:${PORT}/api/v1`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET /api/v1/prompts?language=en`);
  console.log(`   GET /api/v1/prompts?language=fr`);
});
