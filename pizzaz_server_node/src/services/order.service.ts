import pool from "../database/pool.js";
import config from "../config/index.js";

export class OrderService {
  /**
   * Create a checkout order with Razorpay
   */
  static async createCheckoutOrder(cart: any[], userId: string, sessionId: string, address: any) {
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      throw new Error("Cart items are required");
    }

    // Calculate line items total
    const lineItemsTotal = cart.reduce((sum: number, item: any) => {
      const itemPrice = Math.round((item.price || 0) * (item.quantity || 1) * 100); // Convert to paise
      return sum + itemPrice;
    }, 0);

    // Format line items for Razorpay
    const lineItems = cart.map((item: any) => ({
      sku: item.product_id?.toString() || item.id?.toString() || "unknown",
      variant_id: item.variant_id?.toString() || item.product_id?.toString() || "",
      other_product_codes: item.other_product_codes || {},
      price: Math.round((item.price || 0) * 100), // Convert to paise
      offer_price: Math.round((item.offer_price || item.price || 0) * 100), // Convert to paise
      tax_amount: Math.round((item.tax_amount || 0) * 100), // Convert to paise
      quantity: item.quantity || 1,
      name: item.title || item.name || "Product",
      description: item.description || item.title || "Product",
      weight: item.weight || 0,
      dimensions: item.dimensions || {},
      image_url: item.thumbnail || item.image_url || "",
      product_url: item.product_url || "",
      notes: item.notes || {}
    }));

    // Create order payload
    const orderPayload = {
      amount: lineItemsTotal,
      currency: "INR",
      receipt: `receipt_${sessionId}_${Date.now()}`,
      notes: {
        user_id: userId || "",
        session_id: sessionId || "",
        address: JSON.stringify(address || {})
      },
      line_items_total: lineItemsTotal,
      line_items: lineItems
    };

    console.log('Creating Razorpay order with payload:', JSON.stringify(orderPayload, null, 2));

    // Create Basic Auth header
    const razorpayAuth = Buffer.from(
      `${config.razorpay.keyId}:${config.razorpay.keySecret}`
    ).toString('base64');

    // Call Razorpay API
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${razorpayAuth}`
      },
      body: JSON.stringify(orderPayload)
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error('Razorpay API Error:', errorData);
      throw new Error(`Razorpay API Error: ${orderResponse.status} - ${errorData}`);
    }

    const orderData = await orderResponse.json();
    console.log('Razorpay order created successfully:', orderData);

    // Store order in database
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO orders (
            user_id, razorpay_order_id, amount, currency, receipt, 
            status, line_items, notes, session_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          userId,
          orderData.id,
          orderData.amount,
          orderData.currency,
          orderData.receipt,
          orderData.status,
          JSON.stringify(lineItems),
          JSON.stringify(orderData.notes),
          sessionId,
          orderData.created_at
        ]);
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('Error storing order in database:', dbError);
      // Continue even if DB storage fails
    }

    return orderData;
  }

  /**
   * Get order by Razorpay order ID
   */
  static async getOrderById(orderId: string) {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          o.*,
          u.username,
          u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.razorpay_order_id = $1
      `, [orderId]);

      if (result.rows.length === 0) {
        throw new Error("Order not found");
      }

      const order = result.rows[0];
      
      // Transform to match expected format
      return {
        id: order.razorpay_order_id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        notes: order.notes,
        created_at: order.created_at,
        line_items: order.line_items,
        username: order.username,
        user_email: order.user_email
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all orders (Admin)
   */
  static async getAllOrders() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          o.*,
          u.username,
          u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `);

      return result.rows.map(order => ({
        id: order.id,
        razorpay_order_id: order.razorpay_order_id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        notes: order.notes,
        created_at: order.created_at,
        line_items: order.line_items,
        username: order.username,
        user_email: order.user_email,
        session_id: order.session_id
      }));
    } finally {
      client.release();
    }
  }
}

export default OrderService;

