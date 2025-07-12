import { Application } from "express";
import express from "express";
import { authMiddleware } from "./auth";
import { requestLogger } from "./requestLogger";
import { rateLimiter } from "./rateLimiter";
import { cors } from "./cors";

export const setupMiddlewares = (app: Application) => {
  app.use(express.json());
  app.use(cors());
  app.use(requestLogger());
  app.use(rateLimiter());
  app.use(authMiddleware);
};
