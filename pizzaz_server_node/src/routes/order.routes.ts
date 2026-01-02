import type { IncomingMessage, ServerResponse } from "node:http";
import { OrderService } from "../services/order.service.js";
import { parseJsonBody, sendSuccessResponse, sendErrorResponse } from "../utils/helpers.js";

export class OrderRoutes {
  /**
   * POST /api/checkout/proceed
   */
  static async proceedToCheckout(req: IncomingMessage, res: ServerResponse) {
    try {
      const { cart, userId, sessionId, address } = await parseJsonBody(req);
      const order = await OrderService.createCheckoutOrder(cart, userId, sessionId, address);
      sendSuccessResponse(res, {
        order,
        message: "Razorpay order created successfully with line items"
      });
    } catch (error: any) {
      console.error("Error creating Razorpay order for checkout:", error);
      const statusCode = error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message || "Failed to create order");
    }
  }

  /**
   * GET /api/orders/:orderId
   */
  static async getOrderById(req: IncomingMessage, res: ServerResponse, url: URL) {
    try {
      const orderId = url.pathname.split("/api/orders/")[1];
      if (!orderId) {
        sendErrorResponse(res, 400, "Order ID is required");
        return;
      }
      const order = await OrderService.getOrderById(orderId);
      sendSuccessResponse(res, { order });
    } catch (error: any) {
      console.error("Error fetching order:", error);
      const statusCode = error.message.includes("not found") ? 404 : 500;
      sendErrorResponse(res, statusCode, error.message || "Failed to fetch order");
    }
  }

  /**
   * GET /api/admin/orders
   */
  static async getAllOrders(req: IncomingMessage, res: ServerResponse) {
    try {
      const orders = await OrderService.getAllOrders();
      sendSuccessResponse(res, { orders });
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      sendErrorResponse(res, 500, error.message || "Failed to fetch orders");
    }
  }
}

export default OrderRoutes;

