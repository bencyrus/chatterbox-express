/**
 * Main Express Application
 * Sets up middleware, routes, and error handling
 */

import express from "express";
import cors from "cors";
import config from "./config/environment.js";
import databaseService from "./services/databaseService.js";
import apiRoutes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { sanitizeInput, validateBodySize } from "./middlewares/validation.js";
import logger from "./utils/logger.js";

/**
 * Create and configure Express application
 * @returns {Express} Configured Express app
 */
export function createApp() {
  const app = express();

  // Trust proxy for accurate IP addresses
  app.set("trust proxy", 1);

  // Security and parsing middleware
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  // Request parsing middleware
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Security middleware
  app.use(validateBodySize(1024 * 1024)); // 1MB limit
  app.use(sanitizeInput);

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.logRequest(req, res.statusCode, duration);
    });

    next();
  });

  // API routes
  app.use("/api/v1", apiRoutes);

  // Health check at root level (for load balancers)
  app.get("/health", (req, res) => {
    res.json({
      status: "OK",
      message: "Cue Backend API is healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
    });
  });

  // Root endpoint
  app.get("/", (req, res) => {
    res.json({
      message: "🎯 Cue Backend API",
      version: "1.0.0",
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      documentation: {
        endpoints: [
          "GET /health - Health check",
          "GET /api/v1 - API information",
          "GET /api/v1/prompts?language=en|fr - Get prompts",
          "POST /api/v1/backup-db - Send database backup",
          "POST /api/v1/auth/request-login - Request login code",
          "POST /api/v1/auth/verify-login - Verify login code",
          "GET /api/v1/auth/verify - Verify JWT token",
          "POST /api/v1/auth/logout - Logout user",
        ],
        authentication: "Some endpoints require Bearer token authentication",
        rateLimit: "Rate limiting is applied to prevent abuse",
      },
    });
  });

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Initialize application with database setup
 * @returns {Promise<Express>} Initialized Express app
 */
export async function initializeApp() {
  try {
    // Initialize database
    await databaseService.initialize();

    // Create and return Express app
    const app = createApp();

    logger.info("✅ Application initialized successfully");
    return app;
  } catch (error) {
    logger.error("❌ Application initialization failed", {
      error: error.message,
    });
    throw error;
  }
}

export default createApp;
