import { Request, Response, NextFunction } from "express";
/**
 * Setup Sentry request and tracing middleware
 * Must be first middleware in the chain
 */
export declare function setupSentryMiddleware(app: any): void;
/**
 * Attach Sentry context for user and request details
 */
export declare function attachSentryContext(
  /**
   * Attach Sentry Context
   *
   * @param {Request} req - HTTP request object
   * @param {Response} res - HTTP response object
   * @param {NextFunction} next - Next middleware function
   */
  /**
   * Attach Sentry Context
   *
   * @param {Request} req - HTTP request object
   * @param {Response} res - HTTP response object
   * @param {NextFunction} next - Next middleware function
   */
  req: Request,
  res: Response,
  next: NextFunction,
): void;
