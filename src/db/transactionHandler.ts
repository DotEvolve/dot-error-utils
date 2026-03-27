import * as Sentry from "@sentry/node";
import { getLogger } from "../logger";

/**
 * Execute a Prisma database transaction with Sentry performance monitoring and
 * structured logging.
 *
 * Wraps the callback in a Sentry span named `operationName`, logs the start,
 * completion (with duration), and any failure. On error, adds a Sentry
 * breadcrumb and captures the exception before re-throwing.
 *
 * Prisma handles rollback automatically when the callback throws.
 *
 * @typeParam T - The return type of the transaction callback
 * @param prisma - Prisma client instance (must expose `$transaction`)
 * @param callback - Async function that receives the Prisma transaction client
 * @param operationName - Label used for the Sentry span and log entries (default: `"database_transaction"`)
 * @returns A promise that resolves with the value returned by `callback`
 * @throws Re-throws any error thrown by `callback` or by Prisma
 * @prismaOnly This utility calls `prisma.$transaction` internally and is NOT
 * compatible with Mongoose. For Mongoose-based services, implement a local
 * `withMongooseTransaction` using `mongoose.startSession()` instead.
 *
 * @example
 * ```ts
 * import { withTransaction } from '@dotevolve/error-utils/node';
 *
 * const user = await withTransaction(prisma, async (tx) => {
 *   return tx.user.create({ data: { email: 'a@example.com' } });
 * }, 'create-user');
 * ```
 */
export async function withTransaction<T>(
  /**
   * Asynchronously with transaction
   *
   * @param {any} prisma - The prisma
   * @param {Function} callback - Callback function
   * @param {string} operationName="database_transaction" - The operation name
   * @returns {Promise} The Promise
   */
  prisma: any,
  callback: (tx: any) => Promise<T>,
  operationName: string = "database_transaction",
): Promise<T> {
  return await Sentry.startSpan(
    { name: operationName, op: "db.transaction" },
    async () => {
      const startMs = Date.now();
      getLogger().info({ operationName }, "transaction started");
      try {
        // Execute Prisma transaction
        const result = await prisma.$transaction(async (tx: any) => {
          return await callback(tx);
        });
        getLogger().info(
          { operationName, durationMs: Date.now() - startMs },
          "transaction completed",
        );
        return result;
      } catch (error) {
        getLogger().error(
          {
            operationName,
            err: error instanceof Error ? error.message : String(error),
          },
          "transaction failed",
        );

        // Add breadcrumb for rollback
        Sentry.addBreadcrumb({
          category: "transaction",
          message: `Transaction rolled back: ${operationName}`,
          level: "error",
          data: {
            operation: operationName,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        // Capture exception to Sentry
        Sentry.captureException(error, {
          tags: {
            transaction_operation: operationName,
            transaction_status: "rolled_back",
          },
        });

        throw error;
      }
    },
  );
}
