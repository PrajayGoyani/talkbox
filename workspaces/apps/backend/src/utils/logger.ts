/* eslint-disable no-console */
import { NODE_ENV } from "@config/env";

export type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Default log level: info in production, debug in development/test
const DEFAULT_LOG_LEVEL: LogLevel = NODE_ENV === "production" ? "info" : "debug";

class Logger {
  private currentLevel: LogLevel = DEFAULT_LOG_LEVEL;

  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_SEVERITY[level] <= LEVEL_SEVERITY[this.currentLevel];
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    if (NODE_ENV === "production") {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(meta !== undefined ? { meta } : {}),
      });
    }

    const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
    const colors: Record<LogLevel, string> = {
      error: "\x1b[31m", // Red
      warn: "\x1b[33m", // Yellow
      info: "\x1b[32m", // Green
      http: "\x1b[36m", // Cyan
      verbose: "\x1b[35m", // Magenta
      debug: "\x1b[34m", // Blue
      silly: "\x1b[37m", // White
    };
    const reset = "\x1b[0m";
    const color = colors[level] || "";
    return `[${timestamp}] ${color}${level.toUpperCase()}${reset}: ${message}${metaStr}`;
  }

  error(message: string, meta?: any) {
    if (!this.shouldLog("error")) return;
    console.error(this.formatMessage("error", message, meta));
  }

  warn(message: string, meta?: any) {
    if (!this.shouldLog("warn")) return;
    console.warn(this.formatMessage("warn", message, meta));
  }

  info(message: string, meta?: any) {
    if (!this.shouldLog("info")) return;
    console.log(this.formatMessage("info", message, meta));
  }

  http(message: string, meta?: any) {
    if (!this.shouldLog("http")) return;
    console.log(this.formatMessage("http", message, meta));
  }

  verbose(message: string, meta?: any) {
    if (!this.shouldLog("verbose")) return;
    console.log(this.formatMessage("verbose", message, meta));
  }

  debug(message: string, meta?: any) {
    if (!this.shouldLog("debug")) return;
    console.log(this.formatMessage("debug", message, meta));
  }

  silly(message: string, meta?: any) {
    if (!this.shouldLog("silly")) return;
    console.log(this.formatMessage("silly", message, meta));
  }
}

export const logger = new Logger();
