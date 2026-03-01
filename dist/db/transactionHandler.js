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
async function withTransaction(
  prisma,
  callback,
  operationName = "database_transaction",
) {
  return await Sentry.startSpan(
    { name: operationName, op: "db.transaction" },
    async () => {
      try {
        // Execute Prisma transaction
        const result = await prisma.$transaction(async (tx) => {
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
