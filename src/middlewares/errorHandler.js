/**
 * Error Handling Middleware
 * Provides consistent error handling and logging across the application
 */

import config from "../config/environment.js";

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error("🚨 Error occurred:", {
    message: err.message,
    stack: config.isDevelopment ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.headers["user-agent"],
    ip: req.ip || req.connection.remoteAddress,
  });

  // Default error response
  let statusCode = 500;
  let errorMessage = "Internal Server Error";
  let errorCode = "INTERNAL_ERROR";

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    errorMessage = err.message;
    errorCode = "VALIDATION_ERROR";
  } else if (err.name === "UnauthorizedError" || err.message.includes("jwt")) {
    statusCode = 401;
    errorMessage = "Unauthorized";
    errorCode = "UNAUTHORIZED";
  } else if (err.name === "ForbiddenError") {
    statusCode = 403;
    errorMessage = "Forbidden";
    errorCode = "FORBIDDEN";
  } else if (err.name === "NotFoundError") {
    statusCode = 404;
    errorMessage = "Resource not found";
    errorCode = "NOT_FOUND";
  } else if (err.name === "TooManyRequestsError") {
    statusCode = 429;
    errorMessage = "Too many requests";
    errorCode = "RATE_LIMIT_EXCEEDED";
  } else if (err.statusCode && err.statusCode >= 400 && err.statusCode < 600) {
    // If error has a valid HTTP status code, use it
    statusCode = err.statusCode;
    errorMessage = err.message || errorMessage;
  }

  // Prepare error response
  const errorResponse = {
    error: errorCode,
    message: errorMessage,
    timestamp: new Date().toISOString(),
  };

  // Add additional details in development mode
  if (config.isDevelopment) {
    errorResponse.details = {
      stack: err.stack,
      url: req.url,
      method: req.method,
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      "GET /api/v1/prompts?language=en|fr (authenticated)",
      "POST /api/v1/auth/request-login",
      "POST /api/v1/auth/verify-login",
      "GET /api/v1/auth/verify",
      "POST /api/v1/auth/logout",
      "GET /health",
    ],
  });
};

/**
 * Async error wrapper to catch errors in async route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function that catches errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error classes for different types of errors
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.statusCode = 400;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

export class TooManyRequestsError extends Error {
  constructor(message = "Too many requests", retryAfter = 60) {
    super(message);
    this.name = "TooManyRequestsError";
    this.statusCode = 429;
    this.retryAfter = retryAfter;
  }
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
};
