
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';

// Mock the User model to avoid database connection
jest.mock('../models/User', () => ({
  findOne: jest.fn(),
}));

describe('Auth Middleware Security Bypass', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: '/api/secure/resource',
      originalUrl: '/api/secure/resource',
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should block access to secure resource without token', async () => {
    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reproduce the authentication bypass vulnerability', async () => {
    // Vulnerability: appending a specific string to the query allows bypass
    mockRequest.originalUrl = '/api/secure/resource?hack=/book-rss/feed/';

    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // In the vulnerable state, next() IS called because of the loose check
    // Once fixed, this test should fail (or we update expectation to 'not.toHaveBeenCalled')
    expect(nextFunction).toHaveBeenCalled();
  });
});
