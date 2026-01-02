/**
 * Pizzaz MCP Server
 * 
 * A modular, well-organized backend server providing:
 * - MCP (Model Context Protocol) integration
 * - User authentication (JWT-based)
 * - Shopping cart management
 * - Razorpay payment integration
 * - Order management
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";

// Configuration
import config from "./config/index.js";
import { getConfigValue, loadConfig } from "./config/dynamic.js";

// Database
import initDatabase from "./database/init.js";

// MCP Server
import { handleSseRequest, handlePostMessage } from "./mcp/server.js";

// Middleware
import { handleCorsOptions } from "./middleware/cors.js";

// Routes
import AuthRoutes from "./routes/auth.routes.js";
import CartRoutes from "./routes/cart.routes.js";
import RazorpayRoutes from "./routes/razorpay.routes.js";
import OrderRoutes from "./routes/order.routes.js";
import StaticRoutes from "./routes/static.routes.js";
import EnvRoutes from "./routes/env.routes.js";

// Initialize database on startup
initDatabase().catch(console.error);

// Load configuration from database
loadConfig().then(() => {
  console.log('Configuration loaded from database');
}).catch(err => {
  console.error('Failed to load config from database, using defaults:', err.message);
});

/**
 * Main HTTP server request handler
 */
const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  // Parse URL
  const host = req.headers.host || "localhost";
  let url: URL;
  try {
    url = new URL(req.url, `http://${host}`);
  } catch (error) {
    console.error("Invalid URL", error);
    res.writeHead(400).end("Invalid URL");
    return;
  }

  // ==========================================
  // MCP Endpoints
  // ==========================================
  
  // Handle MCP OPTIONS requests
  if (
    req.method === "OPTIONS" &&
    (url.pathname === config.mcp.ssePath || url.pathname === config.mcp.postPath)
  ) {
    handleCorsOptions(res);
    return;
  }

  // Handle MCP SSE connection
  if (req.method === "GET" && url.pathname === config.mcp.ssePath) {
    await handleSseRequest(res, config.mcp.postPath);
    return;
  }

  // Handle MCP POST messages
  if (req.method === "POST" && url.pathname === config.mcp.postPath) {
    await handlePostMessage(req, res, url);
    return;
  }

  // ==========================================
  // Authentication Endpoints
  // ==========================================
  
  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/auth/")) {
    handleCorsOptions(res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    await AuthRoutes.signup(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    await AuthRoutes.login(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/verify") {
    await AuthRoutes.verify(req, res);
    return;
  }

  if (req.method === "OPTIONS" && url.pathname === "/api/admin/users") {
    handleCorsOptions(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/users") {
    await AuthRoutes.getAllUsers(req, res);
    return;
  }

  if (req.method === "OPTIONS" && url.pathname === "/api/admin/users/reset-password") {
    handleCorsOptions(res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/users/reset-password") {
    await AuthRoutes.resetUserPassword(req, res);
    return;
  }

  // ==========================================
  // Environment Variables Endpoints
  // ==========================================

  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/admin/env")) {
    handleCorsOptions(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/env") {
    await EnvRoutes.getAllEnvVariables(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/env/categories") {
    await EnvRoutes.getCategories(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/admin/env/category/")) {
    const category = url.pathname.split("/").pop();
    if (category) {
      await EnvRoutes.getEnvVariablesByCategory(req, res, category);
      return;
    }
  }

  if (req.method === "GET" && url.pathname.match(/^\/api\/admin\/env\/[^\/]+$/)) {
    const key = url.pathname.split("/").pop();
    if (key && key !== "env") {
      await EnvRoutes.getEnvVariable(req, res, key);
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/admin/env") {
    await EnvRoutes.createEnvVariable(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/env/bulk-update") {
    await EnvRoutes.bulkUpdateEnvVariables(req, res);
    return;
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/admin/env/")) {
    const id = url.pathname.split("/").pop();
    if (id) {
      await EnvRoutes.updateEnvVariable(req, res, id);
      return;
    }
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/env/")) {
    const id = url.pathname.split("/").pop();
    if (id) {
      await EnvRoutes.deleteEnvVariable(req, res, id);
      return;
    }
  }

  // ==========================================
  // Cart Endpoints
  // ==========================================
  
  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/cart")) {
    handleCorsOptions(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/cart") {
    await CartRoutes.getCart(req, res, url);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/cart/add") {
    await CartRoutes.addToCart(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/cart/remove") {
    await CartRoutes.removeFromCart(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/cart/clear") {
    await CartRoutes.clearCart(req, res);
    return;
  }

  // ==========================================
  // Razorpay Payment Endpoints
  // ==========================================
  
  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/razorpay/")) {
    handleCorsOptions(res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/razorpay/create-order") {
    await RazorpayRoutes.createOrder(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/razorpay/verify-payment") {
    await RazorpayRoutes.verifyPayment(req, res);
    return;
  }

  if ((req.method === "POST" || req.method === "GET") && url.pathname === "/api/razorpay/parse-store") {
    await RazorpayRoutes.parseStore(req, res, url);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/razorpay/magic-checkout") {
    await RazorpayRoutes.magicCheckout(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/razorpay/magic-checkout") {
    await RazorpayRoutes.magicCheckoutHTML(req, res, url);
    return;
  }

  // ==========================================
  // Order & Checkout Endpoints
  // ==========================================
  
  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/checkout/")) {
    handleCorsOptions(res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/checkout/proceed") {
    await OrderRoutes.proceedToCheckout(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/orders/")) {
    await OrderRoutes.getOrderById(req, res, url);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/orders") {
    await OrderRoutes.getAllOrders(req, res);
    return;
  }

  // ==========================================
  // Static Pages
  // ==========================================
  
  if (req.method === "GET" && url.pathname === "/checkout") {
    StaticRoutes.serveCheckoutPage(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/admin") {
    StaticRoutes.serveAdminPage(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/admin/users") {
    StaticRoutes.serveAdminUsersPage(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/admin/env") {
    StaticRoutes.serveAdminEnvPage(req, res);
    return;
  }

  // ==========================================
  // Static Assets
  // ==========================================
  
  if (req.method === "GET" && url.pathname.startsWith("/")) {
    const served = StaticRoutes.serveAsset(req, res, url);
    if (served) {
      return;
    }
  }

  // ==========================================
  // 404 Not Found
  // ==========================================
  
  res.writeHead(404).end("Not Found");
};

/**
 * Create and start HTTP server
 */
const httpServer = createServer(requestHandler);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

// Start server with dynamic port from database
(async () => {
  try {
    const port = parseInt(await getConfigValue('PORT', '8000'));
    
    httpServer.listen(port, () => {
      console.log(`\n🚀 Pizzaz MCP Server`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📡 Server listening on http://localhost:${port}`);
      console.log(`\n🔌 MCP Endpoints:`);
      console.log(`   SSE Stream:    GET  http://localhost:${port}${config.mcp.ssePath}`);
      console.log(`   Message Post:  POST http://localhost:${port}${config.mcp.postPath}?sessionId=...`);
      console.log(`\n🔐 Auth Endpoints:`);
      console.log(`   Signup:        POST http://localhost:${port}/api/auth/signup`);
      console.log(`   Login:         POST http://localhost:${port}/api/auth/login`);
      console.log(`   Verify:        POST http://localhost:${port}/api/auth/verify`);
      console.log(`\n👥 Admin Endpoints:`);
      console.log(`   Get Users:     GET  http://localhost:${port}/api/admin/users`);
      console.log(`   Reset Password: POST http://localhost:${port}/api/admin/users/reset-password`);
      console.log(`   Get Orders:    GET  http://localhost:${port}/api/admin/orders`);
      console.log(`\n⚙️  Environment Variables:`);
      console.log(`   Get All Env:   GET  http://localhost:${port}/api/admin/env`);
      console.log(`   Get Categories: GET  http://localhost:${port}/api/admin/env/categories`);
      console.log(`   Create Env:    POST http://localhost:${port}/api/admin/env`);
      console.log(`   Update Env:    PUT  http://localhost:${port}/api/admin/env/:id`);
      console.log(`   Delete Env:    DELETE http://localhost:${port}/api/admin/env/:id`);
      console.log(`   Bulk Update:   POST http://localhost:${port}/api/admin/env/bulk-update`);
      console.log(`\n🛒 Cart Endpoints:`);
      console.log(`   Get Cart:      GET  http://localhost:${port}/api/cart?userId=...`);
      console.log(`   Add to Cart:   POST http://localhost:${port}/api/cart/add`);
      console.log(`   Remove:        POST http://localhost:${port}/api/cart/remove`);
      console.log(`   Clear:         POST http://localhost:${port}/api/cart/clear`);
      console.log(`\n💳 Payment Endpoints:`);
      console.log(`   Create Order:  POST http://localhost:${port}/api/razorpay/create-order`);
      console.log(`   Verify:        POST http://localhost:${port}/api/razorpay/verify-payment`);
      console.log(`   Parse Store:   GET  http://localhost:${port}/api/razorpay/parse-store?url=...`);
      console.log(`   Magic Checkout (JSON): POST http://localhost:${port}/api/razorpay/magic-checkout`);
      console.log(`   Magic Checkout (HTML): GET  http://localhost:${port}/api/razorpay/magic-checkout?orderId=...`);
      console.log(`\n📦 Order Endpoints:`);
      console.log(`   Checkout:      POST http://localhost:${port}/api/checkout/proceed`);
      console.log(`   Get Order:     GET  http://localhost:${port}/api/orders/:orderId`);
      console.log(`   Admin Orders:  GET  http://localhost:${port}/api/admin/orders`);
      console.log(`\n📄 Pages:`);
      console.log(`   Checkout:      http://localhost:${port}/checkout`);
      console.log(`   Admin Orders:  http://localhost:${port}/admin`);
      console.log(`   Admin Users:   http://localhost:${port}/admin/users`);
      console.log(`   Admin Env:     http://localhost:${port}/admin/env`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
})();

