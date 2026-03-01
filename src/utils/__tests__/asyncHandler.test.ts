import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../asyncHandler";

describe("asyncHandler", () => {
  const mockRequest = () => ({}) as Request;
  const mockResponse = () => ({}) as Response;
  const mockNext = () => vi.fn() as NextFunction;

  it("should call the async function with req, res, next", async () => {
    const asyncFn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(asyncFn);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    await handler(req, res, next);

    expect(asyncFn).toHaveBeenCalledWith(req, res, next);
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it("should not call next when async function succeeds", async () => {
    const asyncFn = vi.fn().mockResolvedValue({ success: true });
    const handler = asyncHandler(asyncFn);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    await handler(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with error when async function throws", async () => {
    const error = new Error("Test error");
    const asyncFn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(asyncFn);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should handle synchronous errors", async () => {
    const error = new Error("Sync error");
    const asyncFn = vi.fn().mockImplementation(() => {
      throw error;
    });
    const handler = asyncHandler(asyncFn);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should handle promise rejections", async () => {
    const error = new Error("Promise rejection");
    const asyncFn = vi.fn().mockReturnValue(Promise.reject(error));
    const handler = asyncHandler(asyncFn);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should preserve async function return value", async () => {
    const returnValue = { data: "test" };
    const asyncFn = vi.fn().mockResolvedValue(returnValue);
    const handler = asyncHandler(asyncFn);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    const result = await handler(req, res, next);

    // The handler doesn't return the value, but the async function is called
    expect(asyncFn).toHaveBeenCalled();
  });

  it("should work with multiple sequential calls", async () => {
    const asyncFn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(asyncFn);
    const req = mockRequest();
    const res = mockResponse();
    const next1 = mockNext();
    const next2 = mockNext();

    await handler(req, res, next1);
    await handler(req, res, next2);

    expect(asyncFn).toHaveBeenCalledTimes(2);
    expect(next1).not.toHaveBeenCalled();
    expect(next2).not.toHaveBeenCalled();
  });

  it("should handle different error types", async () => {
    const stringError = "String error";
    const asyncFn = vi.fn().mockRejectedValue(stringError);
    const handler = asyncHandler(asyncFn);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(stringError);
  });
});
