/**
 * Validation Middleware
 * Handles request validation and input sanitization
 */

import authService from "../services/authService.js";
import promptService from "../services/promptService.js";
import config from "../config/environment.js";

/**
 * Validate email in request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateEmail = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Email address is required",
      field: "email",
    });
  }

  if (!authService.isValidEmail(email)) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Invalid email format",
      field: "email",
    });
  }

  // Normalize email to lowercase
  req.body.email = email.toLowerCase().trim();
  next();
};

/**
 * Validate login code in request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateLoginCode = (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Login code is required",
      field: "code",
    });
  }

  // Check if code is 6 digits
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Login code must be exactly 6 digits",
      field: "code",
    });
  }

  next();
};

/**
 * Validate language parameter in query string
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateLanguage = (req, res, next) => {
  const { language } = req.query;

  if (!language) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Language parameter is required",
      field: "language",
    });
  }

  if (!promptService.isLanguageSupported(language)) {
    return res.status(400).json({
      error: "Validation failed",
      message: `Unsupported language. Supported languages: ${promptService.supportedLanguages.join(", ")}`,
      field: "language",
    });
  }

  next();
};

/**
 * Sanitize request body to prevent injection attacks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    // Recursively sanitize all string values in request body
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    // Sanitize query parameters
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Recursively sanitize an object's string values
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj === "string") {
    return obj.trim();
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (obj !== null && typeof obj === "object") {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}

/**
 * Validate request body size
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {Function} Middleware function
 */
export const validateBodySize = (maxSize = 1024 * 1024) => {
  // Default 1MB
  return (req, res, next) => {
    const contentLength = parseInt(req.headers["content-length"] || "0");

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: "Request too large",
        message: `Request body size exceeds limit of ${Math.round(maxSize / 1024)}KB`,
        maxSize: maxSize,
      });
    }

    next();
  };
};

// Combined validation for auth endpoints
export const validateEmailLogin = [validateEmail];
export const validateCodeVerification = [validateEmail, validateLoginCode];

export default {
  validateEmail,
  validateLoginCode,
  validateLanguage,
  sanitizeInput,
  validateBodySize,
};
