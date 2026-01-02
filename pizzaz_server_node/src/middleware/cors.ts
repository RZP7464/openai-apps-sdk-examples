import type { IncomingMessage, ServerResponse } from "node:http";
import config from "../config/index.js";

export const handleCorsOptions = (res: ServerResponse, additionalHeaders: Record<string, string> = {}) => {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": config.cors.allowOrigin,
    "Access-Control-Allow-Methods": config.cors.allowMethods,
    "Access-Control-Allow-Headers": config.cors.allowHeaders,
    ...additionalHeaders,
  });
  res.end();
};

export const setCorsHeaders = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", config.cors.allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", config.cors.allowMethods);
  res.setHeader("Access-Control-Allow-Headers", config.cors.allowHeaders);
};

