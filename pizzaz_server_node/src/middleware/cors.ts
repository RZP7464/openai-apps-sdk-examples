import type { IncomingMessage, ServerResponse } from "node:http";
import { getConfigValue } from "../config/dynamic.js";

export const handleCorsOptions = async (res: ServerResponse, additionalHeaders: Record<string, string> = {}) => {
  const allowOrigin = await getConfigValue('CORS_ALLOW_ORIGIN', '*');
  const allowMethods = await getConfigValue('CORS_ALLOW_METHODS', 'GET, POST, OPTIONS');
  const allowHeaders = await getConfigValue('CORS_ALLOW_HEADERS', 'content-type, authorization');
  
  res.writeHead(204, {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": allowMethods,
    "Access-Control-Allow-Headers": allowHeaders,
    ...additionalHeaders,
  });
  res.end();
};

export const setCorsHeaders = async (res: ServerResponse) => {
  const allowOrigin = await getConfigValue('CORS_ALLOW_ORIGIN', '*');
  const allowMethods = await getConfigValue('CORS_ALLOW_METHODS', 'GET, POST, OPTIONS');
  const allowHeaders = await getConfigValue('CORS_ALLOW_HEADERS', 'content-type, authorization');
  
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", allowMethods);
  res.setHeader("Access-Control-Allow-Headers", allowHeaders);
};

