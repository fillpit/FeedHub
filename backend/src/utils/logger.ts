import winston from "winston";
import { config } from "../config";

const winstonLogger = winston.createLogger({
  level: config.app.env === "development" ? "debug" : "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (config.app.env !== "production") {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

function getCallerInfo() {
  const err = new Error();
  const stack = err.stack?.split("\n");
  // stack[0] 是 Error
  // stack[1] 是 getCallerInfo
  // stack[2] 是 logger 方法
  // stack[3] 是调用 logger 的地方
  return stack && stack[3] ? stack[3].trim() : "";
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    winstonLogger.info(msg, ...args);
    console.info(`[INFO] ${getCallerInfo()} ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    winstonLogger.warn(msg, ...args);
    console.warn(`[WARN] ${getCallerInfo()} ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    winstonLogger.error(msg, ...args);
    console.error(`[ERROR] ${getCallerInfo()} ${msg}`, ...args);
  },
  debug: (msg: string, ...args: unknown[]) => {
    winstonLogger.debug(msg, ...args);
    console.debug(`[DEBUG] ${getCallerInfo()} ${msg}`, ...args);
  },
};
