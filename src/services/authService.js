/**
 * Authentication Service
 * Handles user authentication, JWT tokens, and login code generation
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../config/environment.js";
import databaseService from "./databaseService.js";

class AuthService {
  constructor() {
    this.jwtSecret = config.jwtSecret;
    this.jwtExpiresIn = "30d";
    this.loginCodeLength = 6;
    this.loginCodeExpiryMinutes = 10;
    this.rateLimitMinutes = 1;
  }

  /**
   * Generate a 6-digit login code
   * @returns {string} 6-digit login code
   */
  generateLoginCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate JWT token for authenticated user
   * @param {number} accountId - User account ID
   * @param {string} email - User email address
   * @returns {string} JWT token
   */
  generateJWT(accountId, email) {
    const payload = {
      accountId: accountId,
      email: email,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: "cue-app",
    });
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyJWT(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token");
      } else {
        throw new Error("Token validation failed");
      }
    }
  }

  /**
   * Check if user can request a new login code (rate limiting)
   * @param {string} email - User email address
   * @returns {Promise<boolean>} Whether user can request a new code
   */
  async canRequestLoginCode(email) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT COUNT(*) as count FROM login_attempt 
        WHERE email = ? AND created_at > datetime('now', '-${this.rateLimitMinutes} minute')
      `;

      const db = databaseService.getDatabase();
      db.get(query, [email], (err, row) => {
        if (err) {
          reject(new Error("Database error checking rate limit"));
          return;
        }
        resolve(row.count === 0);
      });
    });
  }

  /**
   * Store login attempt in database
   * @param {string} email - User email address
   * @param {string} code - Generated login code
   * @returns {Promise<number>} Login attempt ID
   */
  async storeLoginAttempt(email, code) {
    return new Promise((resolve, reject) => {
      const query = "INSERT INTO login_attempt (email, code) VALUES (?, ?)";

      const db = databaseService.getDatabase();
      db.run(query, [email, code], function (err) {
        if (err) {
          reject(new Error("Database error storing login attempt"));
          return;
        }
        resolve(this.lastID);
      });
    });
  }

  /**
   * Verify login code and mark as used
   * @param {string} email - User email address
   * @param {string} code - Login code to verify
   * @returns {Promise<Object|null>} Login attempt object or null if invalid
   */
  async verifyLoginCode(email, code) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM login_attempt 
        WHERE email = ? AND code = ? AND is_used = 0 
        AND created_at > datetime('now', '-${this.loginCodeExpiryMinutes} minutes')
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const db = databaseService.getDatabase();
      db.get(query, [email, code], (err, attempt) => {
        if (err) {
          reject(new Error("Database error verifying login code"));
          return;
        }

        if (!attempt) {
          resolve(null);
          return;
        }

        // Mark attempt as used
        const markUsedQuery =
          "UPDATE login_attempt SET is_used = 1 WHERE attempt_id = ?";
        db.run(markUsedQuery, [attempt.attempt_id], (err) => {
          if (err) {
            reject(new Error("Database error marking attempt as used"));
            return;
          }
          resolve(attempt);
        });
      });
    });
  }

  /**
   * Find user account by email
   * @param {string} email - User email address
   * @returns {Promise<Object|null>} User account or null if not found
   */
  async findAccountByEmail(email) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM account WHERE email = ?";

      const db = databaseService.getDatabase();
      db.get(query, [email], (err, account) => {
        if (err) {
          reject(new Error("Database error finding account"));
          return;
        }
        resolve(account);
      });
    });
  }

  /**
   * Create new user account
   * @param {string} email - User email address
   * @returns {Promise<number>} New account ID
   */
  async createAccount(email) {
    return new Promise((resolve, reject) => {
      const query =
        'INSERT INTO account (email, last_login_at) VALUES (?, datetime("now"))';

      const db = databaseService.getDatabase();
      db.run(query, [email], function (err) {
        if (err) {
          reject(new Error("Database error creating account"));
          return;
        }
        resolve(this.lastID);
      });
    });
  }

  /**
   * Update user's last login time
   * @param {number} accountId - User account ID
   * @returns {Promise<void>}
   */
  async updateLastLogin(accountId) {
    return new Promise((resolve, reject) => {
      const query =
        'UPDATE account SET last_login_at = datetime("now") WHERE account_id = ?';

      const db = databaseService.getDatabase();
      db.run(query, [accountId], (err) => {
        if (err) {
          console.error("Error updating last login:", err);
          // Don't reject, as this is not critical
        }
        resolve();
      });
    });
  }

  /**
   * Complete login process - find or create account and generate token
   * @param {string} email - User email address
   * @returns {Promise<Object>} Login result with token and account info
   */
  async completeLogin(email) {
    try {
      let account = await this.findAccountByEmail(email);
      let accountId;

      if (account) {
        accountId = account.account_id;
      } else {
        accountId = await this.createAccount(email);
      }

      // Update last login
      await this.updateLastLogin(accountId);

      // Generate JWT token
      const token = this.generateJWT(accountId, email);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      return {
        success: true,
        token: token,
        expiresAt: expiresAt.toISOString(),
        account: {
          accountId: accountId,
          email: email,
        },
      };
    } catch (error) {
      throw new Error(`Login completion failed: ${error.message}`);
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email address to validate
   * @returns {boolean} Whether email format is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
