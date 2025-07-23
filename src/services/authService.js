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
    // Use cryptographically secure random number generation
    const min = 100000;
    const max = 999999;
    return crypto.randomInt(min, max + 1).toString();
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
      issuer: "chatterbox-app",
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
    const pool = databaseService.getPool();
    const client = await pool.connect();

    try {
      // Check recent attempts
      const recentQuery = `
        select count(*) as count from login_attempts 
        where email = $1 and created_at > now() - interval '${this.rateLimitMinutes} minutes'
      `;
      const recentResult = await client.query(recentQuery, [email]);

      // Check for account lockout (too many failed attempts in last hour)
      const lockoutQuery = `
        select count(*) as failed_count from login_attempts 
        where email = $1 
        and created_at > now() - interval '1 hour' 
        and is_used = false
      `;
      const lockoutResult = await client.query(lockoutQuery, [email]);

      // Lock account if more than 10 failed attempts in last hour
      if (parseInt(lockoutResult.rows[0].failed_count) >= 10) {
        throw new Error(
          "Account temporarily locked due to too many failed attempts. Please try again later."
        );
      }

      return recentResult.rows[0].count === "0";
    } catch (error) {
      if (error.message.includes("Account temporarily locked")) {
        throw error;
      }
      throw new Error("database error checking rate limit");
    } finally {
      client.release();
    }
  }

  /**
   * Store login attempt in database
   * @param {string} email - User email address
   * @param {string} code - Generated login code
   * @returns {Promise<number>} Login attempt ID
   */
  async storeLoginAttempt(email, code) {
    const pool = databaseService.getPool();
    const client = await pool.connect();

    try {
      const query =
        "insert into login_attempts (email, code) values ($1, $2) returning attemptid";
      const result = await client.query(query, [email, code]);
      return result.rows[0].attemptid;
    } catch (error) {
      throw new Error("database error storing login attempt");
    } finally {
      client.release();
    }
  }

  /**
   * Verify login code and mark as used
   * @param {string} email - User email address
   * @param {string} code - Login code to verify
   * @returns {Promise<Object|null>} Login attempt object or null if invalid
   */
  async verifyLoginCode(email, code) {
    const pool = databaseService.getPool();
    const client = await pool.connect();

    try {
      await client.query("begin");

      // Get all recent valid attempts for this email (timing attack protection)
      const query = `
        select * from login_attempts 
        where email = $1 and is_used = false 
        and created_at > now() - interval '${this.loginCodeExpiryMinutes} minutes'
        order by created_at desc
      `;

      const result = await client.query(query, [email]);

      let matchedAttempt = null;

      // Use constant-time comparison to prevent timing attacks
      for (const attempt of result.rows) {
        if (
          crypto.timingSafeEqual(
            Buffer.from(attempt.code, "utf8"),
            Buffer.from(code, "utf8")
          )
        ) {
          matchedAttempt = attempt;
          break;
        }
      }

      if (!matchedAttempt) {
        await client.query("commit");
        return null;
      }

      // mark attempt as used
      await client.query(
        "update login_attempts set is_used = true where attemptid = $1",
        [matchedAttempt.attemptid]
      );

      await client.query("commit");
      return matchedAttempt;
    } catch (error) {
      await client.query("rollback");
      throw new Error("database error verifying login code");
    } finally {
      client.release();
    }
  }

  /**
   * Find user account by email
   * @param {string} email - User email address
   * @returns {Promise<Object|null>} User account or null if not found
   */
  async findAccountByEmail(email) {
    const pool = databaseService.getPool();
    const client = await pool.connect();

    try {
      const query = "select * from accounts where email = $1";
      const result = await client.query(query, [email]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new Error("database error finding account");
    } finally {
      client.release();
    }
  }

  /**
   * Create new user account
   * @param {string} email - User email address
   * @returns {Promise<number>} New account ID
   */
  async createAccount(email) {
    const pool = databaseService.getPool();
    const client = await pool.connect();

    try {
      const query = `
        insert into accounts (email, last_login_at) 
        values ($1, now()) 
        returning accountid
      `;

      const result = await client.query(query, [email]);
      return result.rows[0].accountid;
    } catch (error) {
      throw new Error("database error creating account");
    } finally {
      client.release();
    }
  }

  /**
   * Update user's last login time
   * @param {number} accountId - User account ID
   * @returns {Promise<void>}
   */
  async updateLastLogin(accountId) {
    const pool = databaseService.getPool();
    const client = await pool.connect();

    try {
      const query =
        "update accounts set last_login_at = now() where accountid = $1";
      await client.query(query, [accountId]);
    } catch (error) {
      console.error("error updating last login:", error);
      // don't throw, as this is not critical
    } finally {
      client.release();
    }
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
        accountId = account.accountid;
      } else {
        accountId = await this.createAccount(email);
      }

      // update last login
      await this.updateLastLogin(accountId);

      // generate JWT token
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
      throw new Error(`login completion failed: ${error.message}`);
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

// create singleton instance
const authService = new AuthService();

export default authService;
