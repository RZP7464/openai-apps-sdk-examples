import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import config from "../config/index.js";

export class StaticRoutes {
  /**
   * Serve checkout page
   */
  static serveCheckoutPage(req: IncomingMessage, res: ServerResponse) {
    try {
      const checkoutPagePath = path.resolve(config.rootDir, "checkout-page.html");
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
  }

  /**
   * Serve admin page
   */
  static serveAdminPage(req: IncomingMessage, res: ServerResponse) {
    try {
      const adminPagePath = path.resolve(config.rootDir, "admin-orders.html");
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
  }

  /**
   * Serve admin users page
   */
  static serveAdminUsersPage(req: IncomingMessage, res: ServerResponse) {
    try {
      const adminUsersPagePath = path.resolve(config.rootDir, "admin-users.html");
      const content = fs.readFileSync(adminUsersPagePath, "utf8");
      
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(content);
    } catch (error) {
      console.error("Error serving admin users page:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error loading admin users page");
    }
  }

  /**
   * Serve admin env page
   */
  static serveAdminEnvPage(req: IncomingMessage, res: ServerResponse) {
    try {
      const adminEnvPagePath = path.resolve(config.rootDir, "admin-env.html");
      const content = fs.readFileSync(adminEnvPagePath, "utf8");
      
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(content);
    } catch (error) {
      console.error("Error serving admin env page:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error loading admin env page");
    }
  }

  /**
   * Serve static assets
   */
  static serveAsset(req: IncomingMessage, res: ServerResponse, url: URL) {
    const fileName = url.pathname.slice(1); // Remove leading slash
    const filePath = path.join(config.assetsDir, fileName);

    // Only serve files from the assets directory with allowed extensions
    if (
      filePath.startsWith(config.assetsDir) &&
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
        return true;
      } catch (error) {
        // File not found, return false to trigger 404
        return false;
      }
    }
    
    return false;
  }
}

export default StaticRoutes;

