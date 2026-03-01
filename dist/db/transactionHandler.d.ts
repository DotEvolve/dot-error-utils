/**
 * Prisma transaction wrapper with Sentry performance monitoring
 *
 * Automatically tracks transaction duration and captures failures to Sentry
 * Prisma handles rollback automatically on errors
 *
 * @param prisma - Prisma client instance
 * @param callback - Transaction callback function
 * @param operationName - Name for Sentry transaction tracking
 * @returns Result from the transaction callback
 */
export declare function withTransaction<T>(
  prisma: any,
  callback: (tx: any) => Promise<T>,
  operationName?: string,
): Promise<T>;
