import type { IncomingMessage, ServerResponse } from "node:http";
import { RazorpayService } from "../services/razorpay.service.js";
import { parseJsonBody, sendSuccessResponse, sendErrorResponse } from "../utils/helpers.js";

const razorpayService = new RazorpayService();

export class RazorpayRoutes {
  /**
   * POST /api/razorpay/create-order
   */
  static async createOrder(req: IncomingMessage, res: ServerResponse) {
    try {
      const { amount, currency, cart, userId, sessionId, address } = await parseJsonBody(req);
      const order = await razorpayService.createOrder(amount, currency, cart, userId, sessionId, address);
      sendSuccessResponse(res, { order });
    } catch (error: any) {
      console.error("Error creating Razorpay order:", error);
      sendErrorResponse(res, 500, error.message);
    }
  }

  /**
   * POST /api/razorpay/verify-payment
   */
  static async verifyPayment(req: IncomingMessage, res: ServerResponse) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await parseJsonBody(req);
      
      const isAuthentic = razorpayService.verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (isAuthentic) {
        sendSuccessResponse(res, {
          message: "Payment verified successfully",
          payment_id: razorpay_payment_id
        });
      } else {
        sendErrorResponse(res, 400, "Invalid payment signature");
      }
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      sendErrorResponse(res, 500, error.message);
    }
  }

  /**
   * POST /api/razorpay/parse-store
   * GET /api/razorpay/parse-store
   */
  static async parseStore(req: IncomingMessage, res: ServerResponse, url: URL) {
    try {
      let razorpayUrl: string | null;
      
      if (req.method === "POST") {
        const body = await parseJsonBody(req);
        razorpayUrl = body.url;
      } else {
        razorpayUrl = url.searchParams.get('url');
        if (!razorpayUrl) {
          sendErrorResponse(res, 400, "Razorpay store URL is required. Use ?url=https://pages.razorpay.com/stores/st_XXXXX");
          return;
        }
      }

      const result = await razorpayService.parseStore(razorpayUrl!);
      sendSuccessResponse(res, result);
    } catch (error: any) {
      console.error("Error parsing Razorpay store:", error);
      const statusCode = error.message.includes("required") || error.message.includes("Invalid") ? 400 :
                         error.message.includes("not found") ? 404 : 500;
      sendErrorResponse(res, statusCode, error.message || "Failed to parse Razorpay store");
    }
  }

  /**
   * POST /api/razorpay/magic-checkout
   */
  static async magicCheckout(req: IncomingMessage, res: ServerResponse) {
    try {
      const { products, customer, callbacks } = await parseJsonBody(req);
      const result = await razorpayService.createMagicCheckout(products, customer, callbacks);
      sendSuccessResponse(res, result);
    } catch (error: any) {
      console.error("Error creating Magic Checkout:", error);
      const statusCode = error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message || "Failed to create Magic Checkout");
    }
  }

  /**
   * GET /api/razorpay/magic-checkout
   * Returns HTML page with Magic Checkout embedded
   * 
   * Query params:
   * - orderId (required): Razorpay order ID
   * - name: Page title
   * - businessName: Business name to display
   * - customerName: Customer name for prefill
   * - customerEmail: Customer email for prefill
   * - customerPhone: Customer phone for prefill
   * - couponCode: Auto-apply coupon code
   * - callbackUrl: Success callback URL
   * - showCoupons: Show coupon widget (true/false)
   * - address: Customer address
   */
  static async magicCheckoutHTML(req: IncomingMessage, res: ServerResponse, url: URL) {
    try {
      const orderId = url.searchParams.get('orderId');
      
      if (!orderId) {
        sendErrorResponse(res, 400, "orderId is required in query parameters");
        return;
      }

      const params = {
        orderId,
        name: url.searchParams.get('name') || undefined,
        businessName: url.searchParams.get('businessName') || undefined,
        customerName: url.searchParams.get('customerName') || undefined,
        customerEmail: url.searchParams.get('customerEmail') || undefined,
        customerPhone: url.searchParams.get('customerPhone') || undefined,
        couponCode: url.searchParams.get('couponCode') || undefined,
        callbackUrl: url.searchParams.get('callbackUrl') || undefined,
        showCoupons: url.searchParams.get('showCoupons') || undefined,
        address: url.searchParams.get('address') || undefined,
      };

      const html = razorpayService.generateMagicCheckoutHTML(params);

      res.writeHead(200, {
        "Content-Type": "text/html",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(html);
    } catch (error: any) {
      console.error("Error generating Magic Checkout HTML:", error);
      sendErrorResponse(res, 500, error.message || "Failed to generate Magic Checkout HTML");
    }
  }
}

export default RazorpayRoutes;

