/**
 * Validation Utilities
 * Common validation functions used across the application
 */

/**
 * Validate email format using a comprehensive regex
 * @param {string} email - Email address to validate
 * @returns {boolean} Whether email format is valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }

  // RFC 5322 compliant email regex (simplified but robust)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email.trim());
}

/**
 * Validate login code format (6 digits)
 * @param {string} code - Login code to validate
 * @returns {boolean} Whether code format is valid
 */
export function isValidLoginCode(code) {
  if (!code || typeof code !== "string") {
    return false;
  }

  return /^\d{6}$/.test(code.trim());
}

/**
 * Validate language code
 * @param {string} language - Language code to validate
 * @param {Array<string>} supportedLanguages - Array of supported language codes
 * @returns {boolean} Whether language is supported
 */
export function isValidLanguage(language, supportedLanguages = ["en", "fr"]) {
  if (!language || typeof language !== "string") {
    return false;
  }

  return supportedLanguages.includes(language.trim().toLowerCase());
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with isValid and reasons
 */
export function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    requireUppercase = false,
    requireLowercase = false,
    requireNumbers = false,
    requireSpecialChars = false,
  } = options;

  const result = {
    isValid: true,
    reasons: [],
  };

  if (!password || typeof password !== "string") {
    result.isValid = false;
    result.reasons.push("Password is required");
    return result;
  }

  if (password.length < minLength) {
    result.isValid = false;
    result.reasons.push(
      `Password must be at least ${minLength} characters long`
    );
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    result.isValid = false;
    result.reasons.push("Password must contain at least one uppercase letter");
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    result.isValid = false;
    result.reasons.push("Password must contain at least one lowercase letter");
  }

  if (requireNumbers && !/\d/.test(password)) {
    result.isValid = false;
    result.reasons.push("Password must contain at least one number");
  }

  if (
    requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    result.isValid = false;
    result.reasons.push("Password must contain at least one special character");
  }

  return result;
}

/**
 * Sanitize string input to prevent basic injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (!input || typeof input !== "string") {
    return input;
  }

  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ""); // Remove event handlers
}

/**
 * Validate JWT token format (without verifying signature)
 * @param {string} token - JWT token to validate format
 * @returns {boolean} Whether token has valid JWT format
 */
export function isValidJWTFormat(token) {
  if (!token || typeof token !== "string") {
    return false;
  }

  // JWT should have 3 parts separated by dots
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  // Each part should be base64url encoded (basic check)
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every((part) => base64UrlRegex.test(part));
}

/**
 * Validate request body size
 * @param {Object} req - Express request object
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} Whether request size is within limit
 */
export function isValidRequestSize(req, maxSize = 1024 * 1024) {
  const contentLength = parseInt(req.headers["content-length"] || "0");
  return contentLength <= maxSize;
}

/**
 * Validate IP address format
 * @param {string} ip - IP address to validate
 * @returns {boolean} Whether IP format is valid (IPv4 or IPv6)
 */
export function isValidIP(ip) {
  if (!ip || typeof ip !== "string") {
    return false;
  }

  // IPv4 regex
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export default {
  isValidEmail,
  isValidLoginCode,
  isValidLanguage,
  validatePassword,
  sanitizeString,
  isValidJWTFormat,
  isValidRequestSize,
  isValidIP,
};
