import pool from "./pool.js";

export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create addresses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        street TEXT NOT NULL,
        city VARCHAR(255) NOT NULL,
        zip VARCHAR(20) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create cart_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        thumbnail TEXT,
        quantity INTEGER DEFAULT 1,
        session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        payment_id VARCHAR(255) UNIQUE NOT NULL,
        order_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(50) DEFAULT 'success',
        session_id VARCHAR(255),
        cart_data JSONB,
        address_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        razorpay_order_id VARCHAR(255) UNIQUE NOT NULL,
        amount INTEGER NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        receipt VARCHAR(255),
        status VARCHAR(50) DEFAULT 'created',
        line_items JSONB,
        notes JSONB,
        session_id VARCHAR(255),
        created_at INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create env_variables table
    await client.query(`
      CREATE TABLE IF NOT EXISTS env_variables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        is_secret BOOLEAN DEFAULT false,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_razorpay_id ON orders(razorpay_order_id);
      CREATE INDEX IF NOT EXISTS idx_env_key ON env_variables(key);
      CREATE INDEX IF NOT EXISTS idx_env_category ON env_variables(category);
    `);

    // Insert default env variables if not exists
    await client.query(`
      INSERT INTO env_variables (key, value, description, is_secret, category)
      VALUES 
        ('PORT', '8000', 'Server port number', false, 'server'),
        ('HOST', '0.0.0.0', 'Server host', false, 'server'),
        ('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production', 'JWT secret key for token signing', true, 'auth'),
        ('JWT_EXPIRY', '7d', 'JWT token expiry time', false, 'auth'),
        ('RAZORPAY_KEY_ID', 'rzp_live_I51bxdyuOOsDA7', 'Razorpay API Key ID', false, 'payment'),
        ('RAZORPAY_KEY_SECRET', '', 'Razorpay API Key Secret', true, 'payment'),
        ('DB_CONNECT_URL', 'postgresql://n8n_db_m3i6_user:rQ5Npj6UW6MswIiceNFYN4gFJLxr8rnL@dpg-d4o02mvgi27c73drclb0-a.oregon-postgres.render.com/n8n_db_m3i6', 'Database connection string', true, 'database'),
        ('CORS_ALLOW_ORIGIN', '*', 'CORS allowed origins', false, 'server'),
        ('CORS_ALLOW_METHODS', 'GET, POST, OPTIONS', 'CORS allowed HTTP methods', false, 'server'),
        ('CORS_ALLOW_HEADERS', 'content-type, authorization', 'CORS allowed headers', false, 'server')
      ON CONFLICT (key) DO NOTHING
    `);

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

export default initDatabase;

