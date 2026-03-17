import { Request, Response, NextFunction } from "express";
/**
 * Extend Express Request to include correlationId
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
/**
 * Middleware to generate or preserve correlation IDs for request tracing
 *
 * - Generates UUID v4 if X-Correlation-Id header not present
 * - Preserves existing correlation ID from header
 * - Attaches to req.correlationId for downstream use
 * - Sets X-Correlation-Id response header
 *
 * Must be registered after Sentry request handler
 */
export declare function correlationIdMiddleware(
  /**
   * Correlation Id Middleware
   *
   * @param {Request} req - HTTP request object
   * @param {Response} res - HTTP response object
   * @param {NextFunction} next - Next middleware function
   */
  /**
   * Correlation Id Middleware
   *
   * @param {Request} req - HTTP request object
   * @param {Response} res - HTTP response object
   * @param {NextFunction} next - Next middleware function
   */
  req: Request,
  res: Response,
  next: NextFunction,
): void;
