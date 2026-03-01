import { Request, Response, NextFunction } from 'express';
/**
 * Async handler wrapper to eliminate try-catch boilerplate
 *
 * Wraps async route handlers and forwards errors to error handler middleware
 *
 * @param fn - Async route handler function
 * @returns Express middleware function
 *
 * @example
 * app.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await getUserById(req.params.id);
 *   if (!user) throw new NotFoundError('User', req.params.id);
 *   res.json({ success: true, data: user });
 * }));
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
