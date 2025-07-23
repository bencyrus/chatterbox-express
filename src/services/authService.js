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
      const query = `
        select count(*) as count from login_attempts 
        where email = $1 and created_at > now() - interval '${this.rateLimitMinutes} minutes'
      `;

      const result = await client.query(query, [email]);
      return result.rows[0].count === "0";
    } catch (error) {
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

      const query = `
        select * from login_attempts 
        where email = $1 and code = $2 and is_used = false 
        and created_at > now() - interval '${this.loginCodeExpiryMinutes} minutes'
        order by created_at desc
        limit 1
      `;

      const result = await client.query(query, [email, code]);

      if (result.rows.length === 0) {
        await client.query("commit");
        return null;
      }

      const attempt = result.rows[0];

      // mark attempt as used
      await client.query(
        "update login_attempts set is_used = true where attemptid = $1",
        [attempt.attemptid]
      );

      await client.query("commit");
      return attempt;
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
