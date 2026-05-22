// import helmet from 'helmet';
import { ALLOWED_ORIGINS, NODE_ENV } from "@config/env";
import * as Sentry from "@sentry/bun";
import { baseService } from "@services/infra/redis.service";
import { AppError } from "@utils/AppError";
import { generateETag } from "@utils/hash.utils";
import { logger } from "@utils/logger";
import { error as errorResponse, success } from "@utils/response";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import path from "path";

import { app, server } from "@/app";
import { stopAgenda } from "@/config/agenda";

// ____________________ Bootstrap Handlers ____________________

// global application-level middlewares
export function initializeMiddlewares() {
  app.set("trust proxy", 1);
  app.set("etag", (body: any) => generateETag(body));
  // Define allowed origins
  const corsOptions = {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400, // 24 hours
    allowedHeaders: ["Content-Type", "Authorization", "X-Cursor", "X-Limit"],
  };

  app.use(cors(corsOptions));
  // TODO: add helmet middleware, when its a right time. keep it lean in dev
  // app.use(helmet());
  app.use(express.json());
  app.use(cookieParser());
  // app.use(express.urlencoded({ extended: true }));
}

// serve static file assets
export function initializeStatic() {
  // app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));
  app.use(express.static(path.join(process.cwd(), "public")));
}

export function initializeErrorHandlers() {
  // Sentry error handler MUST be before any other error middleware and after all controllers
  Sentry.setupExpressErrorHandler(app);

  // 404 Not Found handler
  app.use((req, res, _next) => {
    const err = errorResponse("ROUTE_NOT_FOUND", `Cannot ${req.method} ${req.path}`);
    if (NODE_ENV === "development") {
      logger.info(`Route not found: ${req.method} ${req.path}`, err);
    }
    res.status(404).json(err);
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
      return;
    }

    let message = err.message || "Internal Server Error";
    if (NODE_ENV !== "development") {
      message = "Internal Server Error";
      // Only capture critical non-AppErrors in production to avoid noise
      if (!(err instanceof AppError)) {
        Sentry.captureException(err);
      }
    }
    logger.error(err.message || "Unhandled error", { stack: err.stack });
    res.status(err.statusCode || 500).json({
      success: false,
      message,
    });
  });
}

export function initializeExtensions() {
  // Extend express response prototype
  (app.response as any).success = function (data: any, statusCode = 200) {
    return this.status(statusCode).json(success(data));
  };
}

// ____________________ End of Bootstrap Handlers ____________________

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  // Force shutdown after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.warn("Graceful shutdown timed out. Forcing shutdown.");
    process.exit(1);
  }, 10000).unref();

  try {
    // 1. Stop background jobs
    await stopAgenda();

    // 2. Close HTTP server and all active sockets
    // This will trigger 'disconnect' events on all sockets
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info("HTTP server closed.");
        resolve();
      });
    });

    // 3. Close Redis (used by socket disconnect handlers)
    await baseService.close();

    // 4. Close MongoDB
    await mongoose.connection.close();
    logger.info("MongoDB connection closed.");
  } catch (err) {
    logger.error("Error during graceful shutdown", { error: err instanceof Error ? err.stack : String(err) });
    process.exit(1);
  }

  process.exit(0);
};

export function setupGracefulShutdown() {
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
