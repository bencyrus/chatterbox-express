/**
 * Authentication Middleware
 * Handles JWT token validation and user authentication
 */

import authService from "../services/authService.js";

/**
 * Middleware to authenticate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided",
        message: "Authorization header with Bearer token is required",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      const decoded = authService.verifyJWT(token);

      req.user = {
        accountId: decoded.accountId,
        email: decoded.email,
        token: token,
        iat: decoded.iat,
      };

      next();
    } catch (error) {
      if (error.message === "Token expired") {
        return res.status(401).json({
          error: "Token expired",
          message: "Please log in again to get a new token",
        });
      } else if (error.message === "Invalid token") {
        return res.status(401).json({
          error: "Invalid token",
          message: "The provided token is malformed or invalid",
        });
      } else {
        return res.status(500).json({
          error: "Token validation failed",
          message: "An error occurred while validating the token",
        });
      }
    }
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      error: "Authentication error",
      message: "Internal server error during authentication",
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuthentication = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token provided, continue without user
    req.user = null;
    return next();
  }

  // Token provided, try to authenticate
  authenticateJWT(req, res, next);
};

export default {
  authenticateJWT,
  optionalAuthentication,
};
