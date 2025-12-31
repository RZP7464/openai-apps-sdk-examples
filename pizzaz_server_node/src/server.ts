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

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
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

    // Dynamic checkout page
    if (req.method === "GET" && url.pathname === "/checkout") {
      const cartData = url.searchParams.get('cart');
      const userId = url.searchParams.get('userId');
      const sessionId = url.searchParams.get('sessionId');
      const addressData = url.searchParams.get('address');
      
      if (!cartData || !userId || !sessionId || !addressData) {
        res.writeHead(400).end("Missing required parameters");
        return;
      }

      const cart = JSON.parse(decodeURIComponent(cartData));
      const address = JSON.parse(decodeURIComponent(addressData));
      const totalAmount = cart.reduce((sum: number, item: any) => sum + item.price, 0);
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_live_I51bxdyuOOsDA7";

      const checkoutHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checkout - Order Summary</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 600px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .content { padding: 30px; }
    .section { margin-bottom: 25px; }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: '';
      width: 4px;
      height: 20px;
      background: #667eea;
      border-radius: 2px;
    }
    .cart-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .cart-item img {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #e9ecef;
    }
    .cart-item-details { flex: 1; }
    .cart-item-title {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
    }
    .cart-item-price {
      font-size: 16px;
      font-weight: 600;
      color: #667eea;
    }
    .address-box {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .address-box p {
      font-size: 14px;
      color: #555;
      line-height: 1.6;
      margin-bottom: 4px;
    }
    .address-box p strong { color: #333; }
    .total-section {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .total-row:last-child {
      margin-bottom: 0;
      padding-top: 10px;
      border-top: 2px solid #dee2e6;
    }
    .total-label { font-size: 14px; color: #666; }
    .total-value { font-size: 16px; font-weight: 600; color: #333; }
    .total-row:last-child .total-label {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    .total-row:last-child .total-value {
      font-size: 24px;
      color: #667eea;
    }
    .pay-button {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .pay-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    .pay-button:active { transform: translateY(0); }
    .secure-badge {
      text-align: center;
      margin-top: 15px;
      font-size: 12px;
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .secure-badge::before {
      content: '🔒';
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Complete Your Order</h1>
      <p>Review your items and proceed to payment</p>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">Order Items</div>
        ${cart.map((item: any) => `
          <div class="cart-item">
            <img src="${item.thumbnail}" alt="${item.title}">
            <div class="cart-item-details">
              <div class="cart-item-title">${item.title}</div>
              <div class="cart-item-price">₹${item.price.toFixed(2)}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <div class="section-title">Delivery Address</div>
        <div class="address-box">
          <p><strong>${address.name}</strong></p>
          <p>${address.street}</p>
          <p>${address.city}, ${address.zip}</p>
          <p>Phone: ${address.phone}</p>
        </div>
      </div>

      <div class="total-section">
        <div class="total-row">
          <span class="total-label">Subtotal (${cart.length} items)</span>
          <span class="total-value">₹${totalAmount.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Delivery</span>
          <span class="total-value">FREE</span>
        </div>
        <div class="total-row">
          <span class="total-label">Total Amount</span>
          <span class="total-value">₹${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <button class="pay-button" onclick="initiatePayment()">
        Proceed to Payment
      </button>
      <div class="secure-badge">
        Secure payment powered by Razorpay
      </div>
    </div>
  </div>

  <script>
    const RAZORPAY_KEY_ID = "${razorpayKeyId}";
    const cartData = ${JSON.stringify(cart)};
    const addressData = ${JSON.stringify(address)};
    const userId = "${userId}";
    const sessionId = "${sessionId}";
    const totalAmount = ${totalAmount};

    async function initiatePayment() {
      try {
        // Create order on backend
        const orderResponse = await fetch(window.location.origin + '/api/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            currency: 'INR',
            cart: cartData.map(item => ({ id: item.id, title: item.title, price: item.price })),
            userId: userId,
            sessionId: sessionId,
            address: addressData
          })
        });

        const orderData = await orderResponse.json();
        if (!orderData.success) {
          throw new Error(orderData.error || 'Failed to create order');
        }

        // Open Razorpay Checkout
        const options = {
          key: RAZORPAY_KEY_ID,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: "Product Store",
          description: \`Order for \${cartData.length} items\`,
          order_id: orderData.order.id,
          prefill: {
            name: addressData.name,
            contact: addressData.phone,
            email: \`\${addressData.name.toLowerCase().replace(/\\s/g, '')}@example.com\`
          },
          notes: orderData.order.notes,
          theme: { color: "#667eea" },
          handler: function(response) {
            // Payment successful
            verifyPayment(response);
          },
          modal: {
            ondismiss: function() {
              console.log('Payment cancelled');
            }
          }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
          alert('Payment failed: ' + response.error.description);
        });
        rzp.open();

      } catch (error) {
        console.error('Payment error:', error);
        alert('Error initiating payment: ' + error.message);
      }
    }

    async function verifyPayment(response) {
      try {
        const verifyResponse = await fetch(window.location.origin + '/api/razorpay/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })
        });

        const verifyData = await verifyResponse.json();
        
        if (verifyData.success) {
          // Show success message and redirect
          alert(\`Payment Successful!\\n\\nPayment ID: \${response.razorpay_payment_id}\\nOrder ID: \${response.razorpay_order_id}\\n\\nYour order will be delivered to:\\n\${addressData.street}, \${addressData.city}\`);
          
          // Store payment info in localStorage to pass back to widget
          localStorage.setItem('lastPayment', JSON.stringify({
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id,
            amount: totalAmount,
            session_id: sessionId,
            user_id: userId,
            timestamp: new Date().toISOString(),
            status: 'success'
          }));
          
          // Redirect back to chat or close window
          window.close();
        } else {
          alert('Payment verification failed. Please contact support.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        alert('Error verifying payment: ' + error.message);
      }
    }
  </script>
</body>
</html>
`;

      res.writeHead(200, {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache"
      });
      res.end(checkoutHtml);
      return;
    }

    // Handle OPTIONS for Razorpay endpoints
    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/razorpay/")) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
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
