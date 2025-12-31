
import { authMiddleware } from "../../middleware/auth";
import { Request, Response, NextFunction } from "express";

describe("Auth Middleware Security Bypass", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: "/setting/get",
      originalUrl: "/setting/get",
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it("should block access to protected route without token", async () => {
    await authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });

  it("should BLOCK auth bypass attempt using query string injection", async () => {
    // Attack vector: append a query parameter that matches the allowlist check
    mockRequest.originalUrl = "/setting/get?fake=/book-rss/feed/";

    // We expect this to fail authentication now
    await authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Should NOT call next() (which would mean bypass successful)
    expect(nextFunction).not.toHaveBeenCalled();

    // Should return 401 Unauthorized
    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });
});
