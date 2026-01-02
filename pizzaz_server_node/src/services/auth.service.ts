import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../database/pool.js";
import { getConfigValue } from "../config/dynamic.js";
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
  static async generateToken(payload: { userId: string; username: string; email: string }): Promise<string> {
    const secret = await getConfigValue('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production');
    const expiry = await getConfigValue('JWT_EXPIRY', '7d');
    return new Promise((resolve, reject) => {
      try {
        const token = jwt.sign(payload, secret, { expiresIn: expiry });
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<any> {
    const secret = await getConfigValue('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production');
    return jwt.verify(token, secret);
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
    const token = await this.generateToken({
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
    const token = await this.generateToken({
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
      const decoded = await this.verifyToken(token) as any;
      
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

  /**
   * Get all users (admin function)
   */
  static async getAllUsers() {
    try {
      const result = await pool.query(`
        SELECT 
          u.id, 
          u.username, 
          u.email, 
          u.created_at,
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.id END) as paid_orders,
          COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.amount ELSE 0 END), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        GROUP BY u.id, u.username, u.email, u.created_at
        ORDER BY u.created_at DESC
      `);

      return result.rows.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
        totalOrders: parseInt(user.total_orders) || 0,
        paidOrders: parseInt(user.paid_orders) || 0,
        totalSpent: parseInt(user.total_spent) || 0,
      }));
    } catch (error: any) {
      console.error("Error fetching users:", error);
      throw new Error("Failed to fetch users");
    }
  }

  /**
   * Generate a random password
   */
  static generateRandomPassword(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Reset user password (admin function)
   */
  static async resetUserPassword(userId: string) {
    // Validation
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      // Check if user exists
      const userResult = await pool.query(
        'SELECT id, username, email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      const user = userResult.rows[0];

      // Generate new temporary password
      const newPassword = this.generateRandomPassword();
      const passwordHash = await this.hashPassword(newPassword);

      // Update user password
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, userId]
      );

      return {
        success: true,
        userId: user.id,
        username: user.username,
        email: user.email,
        temporaryPassword: newPassword,
        message: 'Password has been reset successfully'
      };
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.message === "User not found") {
        throw error;
      }
      throw new Error("Failed to reset password");
    }
  }
}

export default AuthService;

