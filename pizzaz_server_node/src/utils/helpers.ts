import { IncomingMessage } from "node:http";

/**
 * Reads the request body from an HTTP request
 */
export const getRequestBody = (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
};

/**
 * Parses JSON from request body safely
 */
export const parseJsonBody = async (req: IncomingMessage): Promise<any> => {
  const body = await getRequestBody(req);
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
};

/**
 * Sends a JSON response
 */
export const sendJsonResponse = (
  res: any,
  statusCode: number,
  data: any,
  headers: Record<string, string> = {}
) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    ...headers,
  });
  res.end(JSON.stringify(data));
};

/**
 * Sends an error response
 */
export const sendErrorResponse = (
  res: any,
  statusCode: number,
  error: string
) => {
  sendJsonResponse(res, statusCode, {
    success: false,
    error,
  });
};

/**
 * Sends a success response
 */
export const sendSuccessResponse = (
  res: any,
  data: any,
  statusCode: number = 200
) => {
  sendJsonResponse(res, statusCode, {
    success: true,
    ...data,
  });
};

