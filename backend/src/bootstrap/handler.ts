import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "path";

// import helmet from 'helmet';
import { app } from "../app.js";
import { ALLOWED_ORIGINS, NODE_ENV } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { error as errorResponse, success } from "../utils/response.js";

// global application-level middlewares
export function initializeMiddlewares() {
  app.set("trust proxy", 1);
  // Define allowed origins
  const corsOptions = {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400,
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
  // 404 Not Found handler
  app.use((req, res, next) => {
    const err = errorResponse("ROUTE_NOT_FOUND", `Cannot ${req.method} ${req.path}`);
    if (NODE_ENV === "development") {
      console.log(err);
    }
    res.status(404).json(err);
  });

  // Global error handler
  app.use((err, req, res, next) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
      return;
    }

    let message = err.message || "Internal Server Error";
    if (NODE_ENV !== "development") {
      message = "Internal Server Error";
    }
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
      success: false,
      message,
    });
  });
}

export function initializeExtensions() {
  // Enhance express prototype
  app.response.success = function (data, statusCode = 200) {
    return this.status(statusCode).json(success(data));
  };
}
