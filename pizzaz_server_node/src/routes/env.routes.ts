import type { IncomingMessage, ServerResponse } from "node:http";
import { EnvService } from "../services/env.service.js";
import { parseJsonBody, sendSuccessResponse, sendErrorResponse } from "../utils/helpers.js";

export class EnvRoutes {
  /**
   * GET /api/admin/env
   * Get all environment variables
   */
  static async getAllEnvVariables(req: IncomingMessage, res: ServerResponse) {
    try {
      const envVariables = await EnvService.getAllEnvVariables(false);
      sendSuccessResponse(res, { success: true, envVariables });
    } catch (error: any) {
      console.error("Get all env variables error:", error);
      sendErrorResponse(res, 500, error.message);
    }
  }

  /**
   * GET /api/admin/env/categories
   * Get all categories
   */
  static async getCategories(req: IncomingMessage, res: ServerResponse) {
    try {
      const categories = await EnvService.getCategories();
      sendSuccessResponse(res, { success: true, categories });
    } catch (error: any) {
      console.error("Get categories error:", error);
      sendErrorResponse(res, 500, error.message);
    }
  }

  /**
   * GET /api/admin/env/category/:category
   * Get environment variables by category
   */
  static async getEnvVariablesByCategory(req: IncomingMessage, res: ServerResponse, category: string) {
    try {
      const envVariables = await EnvService.getEnvVariablesByCategory(category, false);
      sendSuccessResponse(res, { success: true, envVariables });
    } catch (error: any) {
      console.error("Get env variables by category error:", error);
      sendErrorResponse(res, 500, error.message);
    }
  }

  /**
   * GET /api/admin/env/:key
   * Get a specific environment variable
   */
  static async getEnvVariable(req: IncomingMessage, res: ServerResponse, key: string) {
    try {
      const envVariable = await EnvService.getEnvVariable(key, false);
      
      if (!envVariable) {
        sendErrorResponse(res, 404, "Environment variable not found");
        return;
      }

      sendSuccessResponse(res, { success: true, envVariable });
    } catch (error: any) {
      console.error("Get env variable error:", error);
      sendErrorResponse(res, 500, error.message);
    }
  }

  /**
   * POST /api/admin/env
   * Create a new environment variable
   */
  static async createEnvVariable(req: IncomingMessage, res: ServerResponse) {
    try {
      const { key, value, description, isSecret, category } = await parseJsonBody(req);
      
      const envVariable = await EnvService.createEnvVariable(
        key,
        value,
        description,
        isSecret,
        category
      );

      sendSuccessResponse(res, { success: true, envVariable }, 201);
    } catch (error: any) {
      console.error("Create env variable error:", error);
      const statusCode = error.message.includes("already exists") ? 409 :
                         error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }

  /**
   * PUT /api/admin/env/:id
   * Update an environment variable
   */
  static async updateEnvVariable(req: IncomingMessage, res: ServerResponse, id: string) {
    try {
      const updates = await parseJsonBody(req);
      
      const envVariable = await EnvService.updateEnvVariable(id, updates);
      sendSuccessResponse(res, { success: true, envVariable });
    } catch (error: any) {
      console.error("Update env variable error:", error);
      const statusCode = error.message.includes("not found") ? 404 :
                         error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }

  /**
   * DELETE /api/admin/env/:id
   * Delete an environment variable
   */
  static async deleteEnvVariable(req: IncomingMessage, res: ServerResponse, id: string) {
    try {
      await EnvService.deleteEnvVariable(id);
      sendSuccessResponse(res, { success: true, message: "Environment variable deleted successfully" });
    } catch (error: any) {
      console.error("Delete env variable error:", error);
      const statusCode = error.message.includes("not found") ? 404 :
                         error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }

  /**
   * POST /api/admin/env/bulk-update
   * Bulk update environment variables
   */
  static async bulkUpdateEnvVariables(req: IncomingMessage, res: ServerResponse) {
    try {
      const { updates } = await parseJsonBody(req);
      
      const updatedCount = await EnvService.bulkUpdateEnvVariables(updates);
      sendSuccessResponse(res, { 
        success: true, 
        message: `${updatedCount} environment variable(s) updated successfully`,
        updatedCount 
      });
    } catch (error: any) {
      console.error("Bulk update env variables error:", error);
      const statusCode = error.message.includes("required") ? 400 : 500;
      sendErrorResponse(res, statusCode, error.message);
    }
  }
}

export default EnvRoutes;

