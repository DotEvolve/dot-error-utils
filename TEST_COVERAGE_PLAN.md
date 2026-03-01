# Test Coverage Plan for dot-error-utils

## Current Status

### Completed ✅

1. **Vitest Configuration** - `vitest.config.ts` created with 95% coverage thresholds
2. **Error Classes Tests** - `src/errors/__tests__/AppError.test.ts` (100% coverage)
3. **Error Category Tests** - `src/errors/__tests__/ErrorCategory.test.ts` (100% coverage)
4. **Sanitizer Tests** - `src/utils/__tests__/sanitizer.test.ts` (100% coverage)
5. **Async Handler Tests** - `src/utils/__tests__/asyncHandler.test.ts` (100% coverage)

### Remaining Tests to Write

#### 1. Middleware Tests

- **correlationId.test.ts** - Test correlation ID generation and preservation
- **errorHandler.test.ts** - Test error handler middleware with Sentry mocking
- **sentryMiddleware.test.ts** - Test Sentry middleware setup

#### 2. Database Tests

- **transactionHandler.test.ts** - Test Prisma transaction wrapper with Sentry

#### 3. Sentry Configuration Tests

- **config.test.ts** - Test Sentry initialization

#### 4. Integration Tests

- **integration.test.ts** - End-to-end tests with Express app

## Test Coverage Goals

| Module                         | Target Coverage | Status      |
| ------------------------------ | --------------- | ----------- |
| errors/AppError.ts             | 100%            | ✅ Complete |
| errors/ErrorCategory.ts        | 100%            | ✅ Complete |
| utils/sanitizer.ts             | 100%            | ✅ Complete |
| utils/asyncHandler.ts          | 100%            | ✅ Complete |
| middleware/correlationId.ts    | 95%             | 🔄 Pending  |
| middleware/errorHandler.ts     | 95%             | 🔄 Pending  |
| middleware/sentryMiddleware.ts | 90%             | 🔄 Pending  |
| sentry/config.ts               | 90%             | 🔄 Pending  |
| db/transactionHandler.ts       | 95%             | 🔄 Pending  |

## Comments and Logging Requirements

### 1. Add JSDoc Comments

All functions need comprehensive JSDoc comments including:

- Function description
- @param tags for all parameters
- @returns tag for return values
- @throws tag for exceptions
- @example tag for usage examples

### 2. Add Logging

Implement structured logging using a logger (e.g., winston or pino):

- Log all error captures to Sentry
- Log correlation ID generation
- Log transaction start/end
- Log middleware initialization

### 3. Code Documentation

- Add inline comments for complex logic
- Document all configuration options
- Add README sections for each module

## Next Steps

1. **Install Missing Dependencies**

   ```bash
   npm install --save-dev @vitest/coverage-v8
   ```

2. **Write Remaining Tests**
   - Create test files for middleware
   - Create test files for database utilities
   - Create test files for Sentry configuration
   - Mock Sentry SDK appropriately

3. **Add Comments and Logging**
   - Add JSDoc to all exported functions
   - Implement structured logging
   - Add inline comments for complex logic

4. **Run Coverage Report**

   ```bash
   npm test -- --coverage
   ```

5. **Fix Coverage Gaps**
   - Identify uncovered lines
   - Add tests for edge cases
   - Achieve 95%+ coverage

## Mocking Strategy

### Sentry Mocking

```typescript
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
  startSpan: vi.fn((config, callback) => callback()),
  getActiveSpan: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
}));
```

### Express Mocking

```typescript
const mockRequest = (overrides = {}) =>
  ({
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides,
  }) as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
};
```

### Prisma Mocking

```typescript
const mockPrisma = {
  $transaction: vi.fn((callback) => callback(mockPrisma)),
};
```

## Documentation Improvements

### 1. README Enhancements

- Add usage examples for each module
- Add troubleshooting section
- Add API reference

### 2. Integration Guide Updates

- Add testing section
- Add mocking examples
- Add best practices

### 3. Code Comments

- Add file-level comments explaining module purpose
- Add section comments for grouped functionality
- Add inline comments for complex algorithms

## Success Criteria

- ✅ All tests passing
- ✅ Coverage >= 95% for lines, functions, statements
- ✅ Coverage >= 90% for branches
- ✅ All public functions have JSDoc comments
- ✅ Logging implemented for key operations
- ✅ No TypeScript errors
- ✅ No linting errors
