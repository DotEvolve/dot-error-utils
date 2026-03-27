"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = withTransaction;
const Sentry = __importStar(require("@sentry/node"));
const logger_1 = require("../logger");
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
async function withTransaction(
  /**
   * Asynchronously with transaction
   *
   * @param {any} prisma - The prisma
   * @param {Function} callback - Callback function
   * @param {string} operationName="database_transaction" - The operation name
   * @returns {Promise} The Promise
   */
  prisma,
  callback,
  operationName = "database_transaction",
) {
  return await Sentry.startSpan(
    { name: operationName, op: "db.transaction" },
    async () => {
      const startMs = Date.now();
      (0, logger_1.getLogger)().info({ operationName }, "transaction started");
      try {
        // Execute Prisma transaction
        const result = await prisma.$transaction(async (tx) => {
          return await callback(tx);
        });
        (0, logger_1.getLogger)().info(
          { operationName, durationMs: Date.now() - startMs },
          "transaction completed",
        );
        return result;
      } catch (error) {
        (0, logger_1.getLogger)().error(
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
