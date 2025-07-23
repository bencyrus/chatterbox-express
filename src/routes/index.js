/**
 * Main Routes Index
 * Combines all route modules and sets up API versioning
 */

import express from "express";
import authRoutes from "./auth.js";
import promptRoutes from "./prompts.js";
import backupRoutes from "./backup.js";

const router = express.Router();

// API v1 routes
router.use("/auth", authRoutes);
router.use("/prompts", promptRoutes);
router.use("/", backupRoutes); // backup-db is at root level for backward compatibility

// Health check endpoint (at API level)
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Chatterbox Express API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Root API endpoint with information
router.get("/", (req, res) => {
  res.json({
    message: "🎯 Chatterbox Express API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /api/v1/prompts?language=en|fr (authenticated)",
      "POST /api/v1/backup-db",
      "POST /api/v1/auth/request-login",
      "POST /api/v1/auth/verify-login",
      "GET /api/v1/auth/verify",
      "POST /api/v1/auth/logout",
      "GET /api/v1/health",
      "GET /api/v1/prompts/stats (authenticated)",
      "POST /api/v1/prompts/validate (authenticated)",
    ],
  });
});

export default router;
