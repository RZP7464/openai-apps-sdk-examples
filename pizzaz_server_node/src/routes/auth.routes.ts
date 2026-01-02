import type { IncomingMessage, ServerResponse } from "node:http";
import { AuthService } from "../services/auth.service.js";
import { parseJsonBody, sendSuccessResponse, sendErrorResponse } from "../utils/helpers.js";

export class AuthRoutes {
  /**
   * POST /api/auth/signup
   */
  static async signup(req: IncomingMessage, res: ServerResponse) {
    try {
      const { username, email, password } = await parseJsonBody(req);
      const result = await AuthService.signup(username, email, password);
      sendSuccessResponse(res, result, 201);
    } catch (error: any) {
      console.error("Signup error:", error);
      const statusCode = error.message.includes("already exists") ? 409 : 
                         error.message.includes("required") || error.message.includes("must be") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }

  /**
   * POST /api/auth/login
   */
  static async login(req: IncomingMessage, res: ServerResponse) {
    try {
      const { username, password } = await parseJsonBody(req);
      const result = await AuthService.login(username, password);
      sendSuccessResponse(res, result);
    } catch (error: any) {
      console.error("Login error:", error);
      const statusCode = error.message.includes("Invalid") ? 401 : 
                         error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }

  /**
   * POST /api/auth/verify
   */
  static async verify(req: IncomingMessage, res: ServerResponse) {
    try {
      const { token } = await parseJsonBody(req);
      const result = await AuthService.verifyUserToken(token);
      sendSuccessResponse(res, result);
    } catch (error: any) {
      console.error("Token verification error:", error);
      const statusCode = error.message.includes("required") ? 400 : 401;
      sendErrorResponse(res, statusCode, error.message);
    }
  }

  /**
   * GET /api/admin/users
   */
  static async getAllUsers(req: IncomingMessage, res: ServerResponse) {
    try {
      const users = await AuthService.getAllUsers();
      sendSuccessResponse(res, { success: true, users });
    } catch (error: any) {
      console.error("Get all users error:", error);
      sendErrorResponse(res, 500, error.message);
    }
  }

  /**
   * POST /api/admin/users/reset-password
   */
  static async resetUserPassword(req: IncomingMessage, res: ServerResponse) {
    try {
      const { userId } = await parseJsonBody(req);
      const result = await AuthService.resetUserPassword(userId);
      sendSuccessResponse(res, result);
    } catch (error: any) {
      console.error("Reset password error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 
                         error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }
}

export default AuthRoutes;

