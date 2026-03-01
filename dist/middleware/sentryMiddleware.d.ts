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
  req: Request,
  res: Response,
  next: NextFunction,
): void;
