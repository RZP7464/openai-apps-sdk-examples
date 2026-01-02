/**
 * Main exports for the Pizzaz Server
 * 
 * This file provides a clean API for importing server components
 */

// Configuration
export { default as config } from "./config/index.js";

// Database
export { pool } from "./database/pool.js";
export { initDatabase } from "./database/init.js";

// Services
export { AuthService } from "./services/auth.service.js";
export { CartService } from "./services/cart.service.js";
export { RazorpayService } from "./services/razorpay.service.js";
export { OrderService } from "./services/order.service.js";

// Routes
export { AuthRoutes } from "./routes/auth.routes.js";
export { CartRoutes } from "./routes/cart.routes.js";
export { RazorpayRoutes } from "./routes/razorpay.routes.js";
export { OrderRoutes } from "./routes/order.routes.js";
export { StaticRoutes } from "./routes/static.routes.js";

// MCP
export { createPizzazServer, sessions, handleSseRequest, handlePostMessage } from "./mcp/server.js";
export { widgets, widgetsById, widgetsByUri } from "./mcp/widgets.js";

// Middleware
export { handleCorsOptions, setCorsHeaders } from "./middleware/cors.js";

// Utils
export {
  getRequestBody,
  parseJsonBody,
  sendJsonResponse,
  sendErrorResponse,
  sendSuccessResponse,
} from "./utils/helpers.js";

// Types
export type {
  User,
  CartItem,
  Address,
  Order,
  Payment,
  PizzazWidget,
  SessionRecord,
  ApiResponse,
} from "./types/index.js";

