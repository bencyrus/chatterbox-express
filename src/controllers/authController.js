/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

import authService from "../services/authService.js";
import emailService from "../services/emailService.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

/**
 * Request login code via email
 * POST /api/v1/auth/request-login
 */
export const requestLogin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  console.log(`📡 POST /api/v1/auth/request-login for ${email}`);

  // Check if email service is configured
  if (!emailService.isConfigured()) {
    return res.status(500).json({
      error: "Service unavailable",
      message: "Email service not configured",
    });
  }

  // Check rate limiting
  const canRequest = await authService.canRequestLoginCode(email);
  if (!canRequest) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      message: "Please wait before requesting another code",
      retryAfter: 60,
    });
  }

  try {
    // Generate login code
    const loginCode = authService.generateLoginCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store login attempt
    await authService.storeLoginAttempt(email, loginCode);

    // Send email
    const emailResult = await emailService.sendLoginCode(email, loginCode);

    res.json({
      success: true,
      message: "Login code sent to your email",
      expiresAt: expiresAt.toISOString(),
      messageId: emailResult.messageId,
    });
  } catch (error) {
    console.error("Error in request-login:", error);
    res.status(500).json({
      error: "Failed to send login code",
      message: error.message,
    });
  }
});

/**
 * Verify login code and generate JWT token
 * POST /api/v1/auth/verify-login
 */
export const verifyLogin = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  console.log(`📡 POST /api/v1/auth/verify-login for ${email}`);

  try {
    // Verify login code
    const attempt = await authService.verifyLoginCode(email, code);

    if (!attempt) {
      return res.status(401).json({
        error: "Invalid or expired login code",
        message: "The provided login code is invalid or has expired",
      });
    }

    // Complete login process
    const loginResult = await authService.completeLogin(email);

    res.json({
      success: true,
      message: "Login successful",
      token: loginResult.token,
      expiresAt: loginResult.expiresAt,
      account: loginResult.account,
    });
  } catch (error) {
    console.error("Error in verify-login:", error);
    res.status(500).json({
      error: "Login verification failed",
      message: error.message,
    });
  }
});

/**
 * Verify JWT token and get user info
 * GET /api/v1/auth/verify
 */
export const verifyToken = asyncHandler(async (req, res) => {
  console.log(`📡 GET /api/v1/auth/verify for ${req.user.email}`);

  res.json({
    success: true,
    message: "Token is valid",
    account: {
      accountId: req.user.accountId,
      email: req.user.email,
    },
  });
});

/**
 * Logout user (client-side token deletion)
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  console.log(`📡 POST /api/v1/auth/logout for ${req.user.email}`);

  // Note: With JWTs, we can't invalidate tokens server-side until they expire
  // The client should delete the token from their storage
  // For enhanced security, you could maintain a blacklist of tokens in the database

  res.json({
    success: true,
    message:
      "Logged out successfully. Please delete the token from your device.",
    note: "With JWTs, logout is handled client-side by deleting the token.",
  });
});

export default {
  requestLogin,
  verifyLogin,
  verifyToken,
  logout,
};
