import type { IncomingMessage, ServerResponse } from "node:http";
import { CartService } from "../services/cart.service.js";
import { parseJsonBody, sendSuccessResponse, sendErrorResponse } from "../utils/helpers.js";

export class CartRoutes {
  /**
   * GET /api/cart
   */
  static async getCart(req: IncomingMessage, res: ServerResponse, url: URL) {
    try {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        sendErrorResponse(res, 400, "User ID is required");
        return;
      }
      const cart = await CartService.getCart(userId);
      sendSuccessResponse(res, { cart });
    } catch (error: any) {
      console.error("Error fetching cart:", error);
      sendErrorResponse(res, 500, error.message);
    }
  }

  /**
   * POST /api/cart/add
   */
  static async addToCart(req: IncomingMessage, res: ServerResponse) {
    try {
      const { userId, productId, title, price, thumbnail, sessionId } = await parseJsonBody(req);
      const cart = await CartService.addToCart(userId, productId, title, price, thumbnail, sessionId);
      sendSuccessResponse(res, { cart });
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      const statusCode = error.message.includes("required") || error.message.includes("Missing") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }

  /**
   * POST /api/cart/remove
   */
  static async removeFromCart(req: IncomingMessage, res: ServerResponse) {
    try {
      const { userId, productId } = await parseJsonBody(req);
      const cart = await CartService.removeFromCart(userId, productId);
      sendSuccessResponse(res, { cart });
    } catch (error: any) {
      console.error("Error removing from cart:", error);
      const statusCode = error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }

  /**
   * POST /api/cart/clear
   */
  static async clearCart(req: IncomingMessage, res: ServerResponse) {
    try {
      const { userId } = await parseJsonBody(req);
      const cart = await CartService.clearCart(userId);
      sendSuccessResponse(res, { cart });
    } catch (error: any) {
      console.error("Error clearing cart:", error);
      const statusCode = error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }
}

export default CartRoutes;

