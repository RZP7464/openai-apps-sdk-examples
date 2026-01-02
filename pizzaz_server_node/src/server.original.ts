import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import Razorpay from "razorpay";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

type PizzazWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");

// PostgreSQL Database Connection
const pool = new Pool({
  connectionString: process.env.DB_CONNECT_URL || "postgresql://n8n_db_m3i6_user:rQ5Npj6UW6MswIiceNFYN4gFJLxr8rnL@dpg-d4o02mvgi27c73drclb0-a.oregon-postgres.render.com/n8n_db_m3i6",
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables
async function initDatabase() {
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

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_razorpay_id ON orders(razorpay_order_id);
    `);

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Initialize database on startup
initDatabase().catch(console.error);

// JWT and User Management
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRY = "7d"; // Token expires in 7 days

interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "pnpm run build" before starting the server.`
    );
  }

  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  let htmlContents: string | null = null;

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
  } else {
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      htmlContents = fs.readFileSync(path.join(ASSETS_DIR, fallback), "utf8");
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "pnpm run build" to generate the assets.`
    );
  }

  return htmlContents;
}

function widgetDescriptorMeta(widget: PizzazWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
  } as const;
}

function widgetInvocationMeta(widget: PizzazWidget) {
  return {
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
  } as const;
}

const widgets: PizzazWidget[] = [
  {
    id: "product-search",
    title: "Search Products",
    templateUri: "ui://widget/product-search.html",
    invoking: "Searching products",
    invoked: "Products found",
    html: readWidgetHtml("pizzaz-list"),
    responseText: "Product search results displayed!",
  },
];

const widgetsById = new Map<string, PizzazWidget>();
const widgetsByUri = new Map<string, PizzazWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

const toolInputSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Search query for products (e.g., 'phone', 'laptop')",
    },
    skip: {
      type: "number",
      description: "Number of results to skip for pagination (default: 0)",
      default: 0,
    },
  },
  required: ["query"],
  additionalProperties: false,
} as const;

const toolInputParser = z.object({
  query: z.string(),
  skip: z.number().optional().default(0),
});

const tools: Tool[] = widgets.map((widget) => ({
  name: widget.id,
  description: widget.title,
  inputSchema: toolInputSchema,
  title: widget.title,
  _meta: widgetDescriptorMeta(widget),
  // ChatGPT requires securitySchemes to show tools as public
  securitySchemes: [{ type: "noauth" }],
  // To disable the approval prompt for the widgets
  annotations: {
    destructiveHint: false,
    openWorldHint: false,
    readOnlyHint: true,
  },
}));

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetDescriptorMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetDescriptorMeta(widget),
}));

function createPizzazServer(): Server {
  const server = new Server(
    {
      name: "pizzaz-node",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => ({
      resources,
    })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const widget = widgetsByUri.get(request.params.uri);

      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetDescriptorMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({
      resourceTemplates,
    })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({
      tools,
    })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const widget = widgetsById.get(request.params.name);

      if (!widget) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      const args = toolInputParser.parse(request.params.arguments ?? {});

      return {
        content: [
          {
            type: "text",
            text: widget.responseText,
          },
        ],
        structuredContent: {
          query: args.query,
          skip: args.skip || 0,
        },
        _meta: widgetInvocationMeta(widget),
      };
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createPizzazServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_I51bxdyuOOsDA7",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// Helper function to read request body
const getRequestBody = (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
};

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    // Handle host header more robustly for deployment platforms
    const host = req.headers.host || "localhost";
    let url: URL;
    try {
      url = new URL(req.url, `http://${host}`);
    } catch (error) {
      console.error("Invalid URL", error);
      res.writeHead(400).end("Invalid URL");
      return;
    }

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    // Auth: Signup endpoint
    if (req.method === "POST" && url.pathname === "/api/auth/signup") {
      try {
        const body = await getRequestBody(req);
        const { username, email, password } = JSON.parse(body);

        // Validation
        if (!username || !email || !password) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Username, email, and password are required"
          }));
          return;
        }

        if (password.length < 6) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Password must be at least 6 characters"
          }));
          return;
        }

        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE username = $1 OR email = $2',
          [username, email]
        );

        if (existingUser.rows.length > 0) {
          res.writeHead(409, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Username or email already exists"
          }));
          return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
          `INSERT INTO users (username, email, password_hash) 
           VALUES ($1, $2, $3) 
           RETURNING id, username, email, created_at`,
          [username, email, passwordHash]
        );

        const user = result.rows[0];

        // Generate JWT
        const token = jwt.sign(
          { userId: user.id, username: user.username, email: user.email },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRY }
        );

        res.writeHead(201, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.created_at,
          }
        }));
      } catch (error: any) {
        console.error("Signup error:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }

    // Auth: Login endpoint
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      try {
        const body = await getRequestBody(req);
        const { username, password } = JSON.parse(body);

        // Validation
        if (!username || !password) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Username and password are required"
          }));
          return;
        }

        // Find user
        const result = await pool.query(
          'SELECT id, username, email, password_hash, created_at FROM users WHERE username = $1',
          [username]
        );

        if (result.rows.length === 0) {
          res.writeHead(401, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Invalid username or password"
          }));
          return;
        }

        const user = result.rows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
          res.writeHead(401, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Invalid username or password"
          }));
          return;
        }

        // Generate JWT
        const token = jwt.sign(
          { userId: user.id, username: user.username, email: user.email },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRY }
        );

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.created_at,
          }
        }));
      } catch (error: any) {
        console.error("Login error:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }

    // Auth: Verify token endpoint
    if (req.method === "POST" && url.pathname === "/api/auth/verify") {
      try {
        const body = await getRequestBody(req);
        const { token } = JSON.parse(body);

        if (!token) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Token is required"
          }));
          return;
        }

        // Verify JWT
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        // Get user from database
        const result = await pool.query(
          'SELECT id, username, email, created_at FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (result.rows.length === 0) {
          res.writeHead(401, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "User not found"
          }));
          return;
        }

        const user = result.rows[0];

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.created_at,
          }
        }));
      } catch (error: any) {
        console.error("Token verification error:", error);
        res.writeHead(401, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: "Invalid or expired token"
        }));
      }
      return;
    }

    // Handle OPTIONS for auth endpoints
    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/auth/")) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
      });
      res.end();
      return;
    }

    // Cart: Get cart items
    if (req.method === "GET" && url.pathname === "/api/cart") {
      try {
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "User ID is required"
          }));
          return;
        }

        const result = await pool.query(
          `SELECT id, product_id, title, price, thumbnail, quantity, created_at 
           FROM cart_items 
           WHERE user_id = $1 
           ORDER BY created_at DESC`,
          [userId]
        );

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          cart: result.rows
        }));
      } catch (error: any) {
        console.error("Error fetching cart:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }

    // Cart: Add item to cart
    if (req.method === "POST" && url.pathname === "/api/cart/add") {
      try {
        const body = await getRequestBody(req);
        const { userId, productId, title, price, thumbnail, sessionId } = JSON.parse(body);

        if (!userId || !productId || !title || price === undefined) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Missing required fields"
          }));
          return;
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
        const result = await pool.query(
          `SELECT id, product_id, title, price, thumbnail, quantity 
           FROM cart_items 
           WHERE user_id = $1 
           ORDER BY created_at DESC`,
          [userId]
        );

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          cart: result.rows
        }));
      } catch (error: any) {
        console.error("Error adding to cart:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }

    // Cart: Remove item from cart
    if (req.method === "POST" && url.pathname === "/api/cart/remove") {
      try {
        const body = await getRequestBody(req);
        const { userId, productId } = JSON.parse(body);

        if (!userId || !productId) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "User ID and Product ID are required"
          }));
          return;
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
        const result = await pool.query(
          `SELECT id, product_id, title, price, thumbnail, quantity 
           FROM cart_items 
           WHERE user_id = $1 
           ORDER BY created_at DESC`,
          [userId]
        );

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          cart: result.rows
        }));
      } catch (error: any) {
        console.error("Error removing from cart:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }

    // Cart: Clear cart
    if (req.method === "POST" && url.pathname === "/api/cart/clear") {
      try {
        const body = await getRequestBody(req);
        const { userId } = JSON.parse(body);

        if (!userId) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "User ID is required"
          }));
          return;
        }

        await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          cart: []
        }));
      } catch (error: any) {
        console.error("Error clearing cart:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }

    // Handle OPTIONS for cart endpoints
    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/cart")) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
      });
      res.end();
      return;
    }

    // Razorpay create order endpoint
    if (req.method === "POST" && url.pathname === "/api/razorpay/create-order") {
      try {
        const body = await getRequestBody(req);
        const { amount, currency, cart, userId, sessionId, address } = JSON.parse(body);

        const options = {
          amount: Math.round(amount * 100), // amount in paise
          currency: currency || "INR",
          receipt: `receipt_${sessionId}_${Date.now()}`,
          notes: {
            user_id: userId,
            session_id: sessionId,
            cart_items: JSON.stringify(cart),
            address: JSON.stringify(address),
          },
        };

        const order = await razorpay.orders.create(options);

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          order
        }));
      } catch (error: any) {
        console.error("Error creating Razorpay order:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }

    // Razorpay verify payment endpoint
    if (req.method === "POST" && url.pathname === "/api/razorpay/verify-payment") {
      try {
        const body = await getRequestBody(req);
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(body);

        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
          .update(sign)
          .digest("hex");

        const isAuthentic = expectedSign === razorpay_signature;

        if (isAuthentic) {
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: true,
            message: "Payment verified successfully",
            payment_id: razorpay_payment_id
          }));
        } else {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            message: "Invalid payment signature"
          }));
        }
      } catch (error: any) {
        console.error("Error verifying payment:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }

    // Razorpay parse store endpoint
    if (req.method === "POST" && url.pathname === "/api/razorpay/parse-store") {
      try {
        const body = await getRequestBody(req);
        const { url: razorpayUrl } = JSON.parse(body);

        if (!razorpayUrl) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Razorpay store URL is required"
          }));
          return;
        }

        // Validate URL format
        if (!razorpayUrl.includes("pages.razorpay.com/stores/")) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Invalid Razorpay store URL format"
          }));
          return;
        }

        // Fetch the HTML page
        const response = await fetch(razorpayUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();

        // Extract the window.__REACT_QUERY_STATE__ data
        const scriptMatch = html.match(/window\.__REACT_QUERY_STATE__\s*=\s*({.*?});/s);
        
        if (!scriptMatch || !scriptMatch[1]) {
          res.writeHead(404, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "No products data found in the page"
          }));
          return;
        }

        // Parse the JSON data
        const reactQueryState = JSON.parse(scriptMatch[1]);
        
        // Extract products from the nested structure
        const storeQuery = reactQueryState.queries?.find((q: any) => 
          q.queryKey && q.queryKey[0] && q.queryKey[0].startsWith('store-st_')
        );

        if (!storeQuery || !storeQuery.state?.data?.store?.products) {
          res.writeHead(404, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Products data not found in the expected format"
          }));
          return;
        }

        const products = storeQuery.state.data.store.products;
        const storeInfo = {
          id: storeQuery.state.data.store.id,
          title: storeQuery.state.data.store.title,
          description: storeQuery.state.data.store.description,
          currency: storeQuery.state.data.store.currency,
          categories: storeQuery.state.data.store.categories,
          merchant: storeQuery.state.data.merchant
        };

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          store: storeInfo,
          products: products,
          totalProducts: products.length
        }));

      } catch (error: any) {
        console.error("Error parsing Razorpay store:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message || "Failed to parse Razorpay store"
        }));
      }
      return;
    }

    // Razorpay parse store endpoint (GET with query params)
    if (req.method === "GET" && url.pathname === "/api/razorpay/parse-store") {
      try {
        const razorpayUrl = url.searchParams.get('url');

        if (!razorpayUrl) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Razorpay store URL is required. Use ?url=https://pages.razorpay.com/stores/st_XXXXX"
          }));
          return;
        }

        // Validate URL format
        if (!razorpayUrl.includes("pages.razorpay.com/stores/")) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Invalid Razorpay store URL format"
          }));
          return;
        }

        // Fetch the HTML page
        const response = await fetch(razorpayUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();

        // Extract the window.__REACT_QUERY_STATE__ data
        const scriptMatch = html.match(/window\.__REACT_QUERY_STATE__\s*=\s*({.*?});/s);
        
        if (!scriptMatch || !scriptMatch[1]) {
          res.writeHead(404, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "No products data found in the page"
          }));
          return;
        }

        // Parse the JSON data
        const reactQueryState = JSON.parse(scriptMatch[1]);
        
        // Extract products from the nested structure
        const storeQuery = reactQueryState.queries?.find((q: any) => 
          q.queryKey && q.queryKey[0] && q.queryKey[0].startsWith('store-st_')
        );

        if (!storeQuery || !storeQuery.state?.data?.store?.products) {
          res.writeHead(404, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Products data not found in the expected format"
          }));
          return;
        }

        const products = storeQuery.state.data.store.products;
        const storeInfo = {
          id: storeQuery.state.data.store.id,
          title: storeQuery.state.data.store.title,
          description: storeQuery.state.data.store.description,
          currency: storeQuery.state.data.store.currency,
          categories: storeQuery.state.data.store.categories,
          merchant: storeQuery.state.data.merchant
        };

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          store: storeInfo,
          products: products,
          totalProducts: products.length
        }));

      } catch (error: any) {
        console.error("Error parsing Razorpay store:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message || "Failed to parse Razorpay store"
        }));
      }
      return;
    }

    // Razorpay Magic Checkout - Create Order with Line Items (Enhanced Version)
    if (req.method === "POST" && url.pathname === "/api/razorpay/magic-checkout") {
      try {
        const body = await getRequestBody(req);
        const { products, customer, callbacks } = JSON.parse(body);

        if (!products || !Array.isArray(products) || products.length === 0) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Products array is required"
          }));
          return;
        }

        // Calculate totals
        const lineItemsTotal = products.reduce((sum: number, p: any) => 
          sum + (p.selling_price * (p.quantity || 1)), 0
        );

        // Format line items for Razorpay
        const lineItems = products.map((p: any) => ({
          sku: p.id || p.sku || "default-sku",
          variant_id: p.variant_id || p.id || "",
          price: p.selling_price,
          offer_price: p.discounted_price || p.selling_price,
          tax_amount: p.tax_amount || 0,
          quantity: p.quantity || 1,
          name: p.name,
          description: p.description || p.name,
          image_url: p.images && p.images[0] ? p.images[0] : "",
          product_url: p.product_url || "",
          notes: p.notes || {}
        }));

        // Create order on Razorpay
        const orderPayload = {
          amount: lineItemsTotal,
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
          notes: {},
          line_items_total: lineItemsTotal,
          line_items: lineItems
        };

        const razorpayAuth = Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString('base64');

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
          throw new Error(`Razorpay API Error: ${orderResponse.status} - ${errorData}`);
        }

        const orderData = await orderResponse.json();

        // Generate Magic Checkout URL form data
        const checkoutParams = new URLSearchParams({
          'checkout[key]': process.env.RAZORPAY_KEY_ID || '',
          'checkout[order_id]': orderData.id,
          'checkout[name]': customer?.name || 'Customer',
          'checkout[prefill][contact]': customer?.phone || '',
          'checkout[prefill][email]': customer?.email || '',
          'checkout[notes][mode]': 'live',
          'url[callback]': callbacks?.success || 'https://google.com',
          'url[cancel]': callbacks?.cancel || 'https://yahoo.com'
        });

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          order: orderData,
          checkout_url: 'https://api.razorpay.com/v1/checkout/hosted',
          form_data: Object.fromEntries(checkoutParams),
          html_form: `
            <form id="razorpay-magic-checkout" action="https://api.razorpay.com/v1/checkout/hosted" method="POST">
              <input type="hidden" name="checkout[key]" value="${process.env.RAZORPAY_KEY_ID}" />
              <input type="hidden" name="checkout[order_id]" value="${orderData.id}" />
              <input type="hidden" name="checkout[name]" value="${customer?.name || 'Customer'}" />
              <input type="hidden" name="checkout[prefill][contact]" value="${customer?.phone || ''}" />
              <input type="hidden" name="checkout[prefill][email]" value="${customer?.email || ''}" />
              <input type="hidden" name="checkout[notes][mode]" value="live" />
              <input type="hidden" name="url[callback]" value="${callbacks?.success || 'https://google.com'}" />
              <input type="hidden" name="url[cancel]" value="${callbacks?.cancel || 'https://yahoo.com'}" />
              <button type="submit">Proceed to Magic Checkout</button>
            </form>
            <script>document.getElementById('razorpay-magic-checkout').submit();</script>
          `
        }));

      } catch (error: any) {
        console.error("Error creating Magic Checkout:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message || "Failed to create Magic Checkout"
        }));
      }
      return;
    }

    // Proceed to Checkout - Create Razorpay Order with Line Items
    if (req.method === "POST" && url.pathname === "/api/checkout/proceed") {
      try {
        const body = await getRequestBody(req);
        const { cart, userId, sessionId, address } = JSON.parse(body);

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Cart items are required"
          }));
          return;
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
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
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

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: true,
          order: orderData,
          message: "Razorpay order created successfully with line items"
        }));

      } catch (error: any) {
        console.error("Error creating Razorpay order for checkout:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message || "Failed to create order"
        }));
      }
      return;
    }

    // Get Order by ID
    if (req.method === "GET" && url.pathname.startsWith("/api/orders/")) {
      try {
        const orderId = url.pathname.split("/api/orders/")[1];
        
        if (!orderId) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: false,
            error: "Order ID is required"
          }));
          return;
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
            res.writeHead(404, {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({
              success: false,
              error: "Order not found"
            }));
            return;
          }

          const order = result.rows[0];
          
          // Transform to match expected format
          const orderResponse = {
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

          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: true,
            order: orderResponse
          }));
        } finally {
          client.release();
        }
      } catch (error: any) {
        console.error("Error fetching order:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message || "Failed to fetch order"
        }));
      }
      return;
    }

    // Admin: Get All Orders
    if (req.method === "GET" && url.pathname === "/api/admin/orders") {
      try {
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

          const orders = result.rows.map(order => ({
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

          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({
            success: true,
            orders: orders
          }));
        } finally {
          client.release();
        }
      } catch (error: any) {
        console.error("Error fetching orders:", error);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message || "Failed to fetch orders"
        }));
      }
      return;
    }

    // Serve checkout page
    if (req.method === "GET" && url.pathname === "/checkout") {
      try {
        const checkoutPagePath = path.resolve(ROOT_DIR, "checkout-page.html");
        const content = fs.readFileSync(checkoutPagePath, "utf8");
        
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(content);
      } catch (error) {
        console.error("Error serving checkout page:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error loading checkout page");
      }
      return;
    }

    // Serve admin page
    if (req.method === "GET" && url.pathname === "/admin") {
      try {
        const adminPagePath = path.resolve(ROOT_DIR, "admin-orders.html");
        const content = fs.readFileSync(adminPagePath, "utf8");
        
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(content);
      } catch (error) {
        console.error("Error serving admin page:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error loading admin page");
      }
      return;
    }

    // Handle OPTIONS for Razorpay endpoints
    if (req.method === "OPTIONS" && (url.pathname.startsWith("/api/razorpay/") || url.pathname.startsWith("/api/checkout/"))) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
      });
      res.end();
      return;
    }

    // Serve static assets from the assets directory
    if (req.method === "GET" && url.pathname.startsWith("/")) {
      const fileName = url.pathname.slice(1); // Remove leading slash
      const filePath = path.join(ASSETS_DIR, fileName);

      // Only serve files from the assets directory with allowed extensions
      if (
        filePath.startsWith(ASSETS_DIR) &&
        (fileName.endsWith(".js") ||
          fileName.endsWith(".css") ||
          fileName.endsWith(".html") ||
          fileName.endsWith(".map"))
      ) {
        try {
          const content = fs.readFileSync(filePath);
          const contentType = fileName.endsWith(".js")
            ? "application/javascript"
            : fileName.endsWith(".css")
            ? "text/css"
            : fileName.endsWith(".html")
            ? "text/html"
            : fileName.endsWith(".map")
            ? "application/json"
            : "application/octet-stream";

          res.writeHead(200, {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*",
          });
          res.end(content);
          return;
        } catch (error) {
          // File not found, fall through to 404
        }
      }
    }

    // 404 Not Found
    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Pizzaz MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});
