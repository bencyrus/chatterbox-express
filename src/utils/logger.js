/**
 * Logger Utility
 * Provides consistent logging across the application
 */

import config from "../config/environment.js";

/**
 * Log levels
 */
export const LogLevel = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

/**
 * Logger class with different log levels
 */
class Logger {
  constructor() {
    this.isDevelopment = config.isDevelopment;
  }

  /**
   * Format log message with timestamp and level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} meta - Additional metadata
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {any} meta - Additional metadata (error object, context, etc.)
   */
  error(message, meta = null) {
    console.error(this.formatMessage(LogLevel.ERROR, message, meta));
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {any} meta - Additional metadata
   */
  warn(message, meta = null) {
    console.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {any} meta - Additional metadata
   */
  info(message, meta = null) {
    console.log(this.formatMessage(LogLevel.INFO, message, meta));
  }

  /**
   * Log debug message (only in development)
   * @param {string} message - Debug message
   * @param {any} meta - Additional metadata
   */
  debug(message, meta = null) {
    if (this.isDevelopment) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }

  /**
   * Log HTTP request
   * @param {Object} req - Express request object
   * @param {number} statusCode - HTTP status code
   * @param {number} responseTime - Response time in milliseconds
   */
  logRequest(req, statusCode, responseTime) {
    const message = `${req.method} ${req.url} - ${statusCode}`;
    const meta = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
      responseTime: `${responseTime}ms`,
    };

    if (statusCode >= 400) {
      this.error(message, meta);
    } else {
      this.info(message, meta);
    }
  }

  /**
   * Log application startup
   * @param {number} port - Server port
   */
  logStartup(port) {
    this.info("🚀 Cue Backend API started", {
      port: port,
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    });

    this.info("📱 Update your iOS app endpoints:");
    this.info(`   Base URL: http://localhost:${port}`);
    this.info(
      `   Prompts: GET http://localhost:${port}/api/v1/prompts?language=en`
    );
    this.info(
      `   Auth: POST http://localhost:${port}/api/v1/auth/request-login`
    );
  }

  /**
   * Log application shutdown
   */
  logShutdown() {
    this.info("🛑 Cue Backend API shutting down gracefully");
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
