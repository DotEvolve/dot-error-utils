import * as Sentry from "@sentry/node";

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
export async function withTransaction<T>(
  prisma: any,
  callback: (tx: any) => Promise<T>,
  operationName: string = "database_transaction",
): Promise<T> {
  return await Sentry.startSpan(
    { name: operationName, op: "db.transaction" },
    async () => {
      try {
        // Execute Prisma transaction
        const result = await prisma.$transaction(async (tx: any) => {
          return await callback(tx);
        });
        return result;
      } catch (error) {
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
