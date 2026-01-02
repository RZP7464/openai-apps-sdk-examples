import pool from "../database/pool.js";

export class CartService {
  /**
   * Get cart items for a user
   */
  static async getCart(userId: string) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const result = await pool.query(
      `SELECT id, product_id, title, price, thumbnail, quantity, created_at 
       FROM cart_items 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Add item to cart
   */
  static async addToCart(
    userId: string,
    productId: number,
    title: string,
    price: number,
    thumbnail?: string,
    sessionId?: string
  ) {
    if (!userId || !productId || !title || price === undefined) {
      throw new Error("Missing required fields");
    }

    // Check if item already exists in cart
    const existing = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (existing.rows.length > 0) {
      // Update quantity
      await pool.query(
        'UPDATE cart_items SET quantity = quantity + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [existing.rows[0].id]
      );
    } else {
      // Insert new item
      await pool.query(
        `INSERT INTO cart_items (user_id, product_id, title, price, thumbnail, session_id) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, productId, title, price, thumbnail, sessionId]
      );
    }

    // Get updated cart
    return this.getCart(userId);
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(userId: string, productId: number) {
    if (!userId || !productId) {
      throw new Error("User ID and Product ID are required");
    }

    // Get current quantity
    const existing = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (existing.rows.length > 0) {
      const item = existing.rows[0];
      if (item.quantity > 1) {
        // Decrease quantity
        await pool.query(
          'UPDATE cart_items SET quantity = quantity - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [item.id]
        );
      } else {
        // Remove item
        await pool.query(
          'DELETE FROM cart_items WHERE id = $1',
          [item.id]
        );
      }
    }

    // Get updated cart
    return this.getCart(userId);
  }

  /**
   * Clear entire cart
   */
  static async clearCart(userId: string) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    return [];
  }
}

export default CartService;

