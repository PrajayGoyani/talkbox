import { formatZodErrors } from "@utils/helper";
import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";

const validateRequest =
  (source: "body" | "query" | "params") => (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      Object.defineProperty(req, source, {
        value: parsed,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: errors[0]?.message || "Validation failed",
            details: errors,
          },
        });
      }
      next(error);
    }
  };

export const validate = validateRequest("body");
export const validateQuery = validateRequest("query");
export const validateParams = validateRequest("params");
