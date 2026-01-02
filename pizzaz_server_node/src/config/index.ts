import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");

export const config = {
  // Server Configuration
  port: Number(process.env.PORT ?? 8000),
  host: process.env.HOST || "0.0.0.0",
  
  // Paths
  rootDir: ROOT_DIR,
  assetsDir: ASSETS_DIR,
  
  // Database Configuration
  database: {
    connectionString: process.env.DB_CONNECT_URL || 
      "postgresql://n8n_db_m3i6_user:rQ5Npj6UW6MswIiceNFYN4gFJLxr8rnL@dpg-d4o02mvgi27c73drclb0-a.oregon-postgres.render.com/n8n_db_m3i6",
    ssl: {
      rejectUnauthorized: false
    }
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
    expiry: "7d"
  },
  
  // Razorpay Configuration
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_live_I51bxdyuOOsDA7",
    keySecret: process.env.RAZORPAY_KEY_SECRET || ""
  },
  
  // MCP Configuration
  mcp: {
    ssePath: "/mcp",
    postPath: "/mcp/messages"
  },
  
  // CORS Configuration
  cors: {
    allowOrigin: "*",
    allowMethods: "GET, POST, OPTIONS",
    allowHeaders: "content-type, authorization"
  }
} as const;

export default config;

