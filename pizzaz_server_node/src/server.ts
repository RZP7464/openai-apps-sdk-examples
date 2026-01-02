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

// Initialize database on startup
initDatabase().catch(console.error);

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

httpServer.listen(config.port, () => {
  console.log(`\n🚀 Pizzaz MCP Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📡 Server listening on http://localhost:${config.port}`);
  console.log(`\n🔌 MCP Endpoints:`);
  console.log(`   SSE Stream:    GET  http://localhost:${config.port}${config.mcp.ssePath}`);
  console.log(`   Message Post:  POST http://localhost:${config.port}${config.mcp.postPath}?sessionId=...`);
  console.log(`\n🔐 Auth Endpoints:`);
  console.log(`   Signup:        POST http://localhost:${config.port}/api/auth/signup`);
  console.log(`   Login:         POST http://localhost:${config.port}/api/auth/login`);
  console.log(`   Verify:        POST http://localhost:${config.port}/api/auth/verify`);
  console.log(`\n🛒 Cart Endpoints:`);
  console.log(`   Get Cart:      GET  http://localhost:${config.port}/api/cart?userId=...`);
  console.log(`   Add to Cart:   POST http://localhost:${config.port}/api/cart/add`);
  console.log(`   Remove:        POST http://localhost:${config.port}/api/cart/remove`);
  console.log(`   Clear:         POST http://localhost:${config.port}/api/cart/clear`);
  console.log(`\n💳 Payment Endpoints:`);
  console.log(`   Create Order:  POST http://localhost:${config.port}/api/razorpay/create-order`);
  console.log(`   Verify:        POST http://localhost:${config.port}/api/razorpay/verify-payment`);
  console.log(`   Parse Store:   GET  http://localhost:${config.port}/api/razorpay/parse-store?url=...`);
  console.log(`   Magic Checkout (JSON): POST http://localhost:${config.port}/api/razorpay/magic-checkout`);
  console.log(`   Magic Checkout (HTML): GET  http://localhost:${config.port}/api/razorpay/magic-checkout?orderId=...`);
  console.log(`\n📦 Order Endpoints:`);
  console.log(`   Checkout:      POST http://localhost:${config.port}/api/checkout/proceed`);
  console.log(`   Get Order:     GET  http://localhost:${config.port}/api/orders/:orderId`);
  console.log(`   Admin Orders:  GET  http://localhost:${config.port}/api/admin/orders`);
  console.log(`\n📄 Pages:`);
  console.log(`   Checkout:      http://localhost:${config.port}/checkout`);
  console.log(`   Admin:         http://localhost:${config.port}/admin`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

