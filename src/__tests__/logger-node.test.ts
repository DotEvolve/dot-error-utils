import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSentryStream, createLogger, getLogger } from "../logger/index";
import * as Sentry from "@sentry/node";

vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe("createSentryStream", () => {
  let stream: any;

  beforeEach(() => {
    vi.clearAllMocks();
    stream = createSentryStream();
  });

  const writeToStream = (record: any) => {
    return new Promise<void>((resolve) => {
      stream.write(Buffer.from(JSON.stringify(record)), "utf8", resolve);
    });
  };

  it("calls captureException for level >= 50", async () => {
    await writeToStream({ level: 50, msg: "server crash" });
    expect(Sentry.captureException).toHaveBeenCalledOnce();
    const [err, opts] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("server crash");
    expect((opts as any)?.level).toBe("error");
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
  });

  it("calls addBreadcrumb for 30 <= level < 50", async () => {
    await writeToStream({ level: 30, msg: "user logged in", reqId: "abc" });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledOnce();
    const [breadcrumb] = vi.mocked(Sentry.addBreadcrumb).mock.calls[0];
    expect(breadcrumb.level).toBe("info");
    expect(breadcrumb.message).toBe("user logged in");
    expect(breadcrumb.data?.reqId).toBe("abc");
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("calls neither for level < 30", async () => {
    await writeToStream({ level: 20, msg: "debug trace" });
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reconstructs serialized error objects before captureException", async () => {
    await writeToStream({ level: 50, err: { message: "db timeout", type: "TimeoutError" } });
    expect(Sentry.captureException).toHaveBeenCalledOnce();
    const [err] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("db timeout");
  });

  it("swallows JSON parse failures and still calls the callback", () => {
    return new Promise<void>((resolve, reject) => {
      try {
        stream.write(Buffer.from("not valid json"), "utf8", () => {
          expect(Sentry.captureException).not.toHaveBeenCalled();
          expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  });
});

describe("createLogger with NODE_ENV = 'test'", () => {
  it("returns noopLogger and does not create sentry stream", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    
    const logger = createLogger("test-svc");
    expect(logger).toBe(getLogger());
    
    expect(() => logger.error("boom")).not.toThrow();
    // Since it's noop, it won't write to any stream
    expect(Sentry.captureException).not.toHaveBeenCalled();
    
    process.env.NODE_ENV = originalEnv;
  });
});
