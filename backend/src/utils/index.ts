import jwt from "jsonwebtoken";
import { Request } from "express";
import { config } from "../config";

interface JwtPayload {
  userId: string;
}

export function getUserIdFromToken(req: Request): string | null {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new Error("Token not found");
    }
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded.userId;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
}
