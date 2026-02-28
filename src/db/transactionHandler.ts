import * as Sentry from '@sentry/node';

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
  operationName: string = 'database_transaction'
): Promise<T> {
  // Start Sentry transaction
  const transaction = Sentry.startTransaction({
    op: 'db.transaction',
    name: operationName,
  });

  try {
    // Start span for transaction
    const span = transaction.startChild({
      op: 'db.transaction.execute',
      description: operationName,
    });

    // Execute Prisma transaction
    const result = await prisma.$transaction(async (tx: any) => {
      return await callback(tx);
    });

    span.setStatus('ok');
    span.finish();
    transaction.setStatus('ok');

    return result;
  } catch (error) {
    // Transaction automatically rolled back by Prisma
    transaction.setStatus('internal_error');

    // Add breadcrumb for rollback
    Sentry.addBreadcrumb({
      category: 'transaction',
      message: `Transaction rolled back: ${operationName}`,
      level: 'error',
      data: {
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    // Capture exception to Sentry
    Sentry.captureException(error, {
      tags: {
        transaction_operation: operationName,
        transaction_status: 'rolled_back',
      },
    });

    throw error;
  } finally {
    transaction.finish();
  }
}
