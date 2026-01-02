import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../database/pool.js";
import config from "../config/index.js";
import type { User } from "../types/index.js";

export class AuthService {
  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload: { userId: string; username: string; email: string }): string {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiry });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): any {
    return jwt.verify(token, config.jwt.secret);
  }

  /**
   * Sign up a new user
   */
  static async signup(username: string, email: string, password: string) {
    // Validation
    if (!username || !email || !password) {
      throw new Error("Username, email, and password are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error("Username or email already exists");
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      email: user.email
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      }
    };
  }

  /**
   * Login a user
   */
  static async login(username: string, password: string) {
    // Validation
    if (!username || !password) {
      throw new Error("Username and password are required");
    }

    // Find user
    const result = await pool.query(
      'SELECT id, username, email, password_hash, created_at FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid username or password");
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error("Invalid username or password");
    }

    // Generate JWT
    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      email: user.email
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      }
    };
  }

  /**
   * Verify token and get user
   */
  static async verifyUserToken(token: string) {
    if (!token) {
      throw new Error("Token is required");
    }

    try {
      // Verify JWT
      const decoded = this.verifyToken(token) as any;
      
      // Get user from database
      const result = await pool.query(
        'SELECT id, username, email, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      const user = result.rows[0];

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at,
        }
      };
    } catch (error: any) {
      throw new Error("Invalid or expired token");
    }
  }
}

export default AuthService;

