import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

import { formatZodErrors } from "../utils/helper";

export const validate = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = formatZodErrors(error);
      return res.status(400).json({ message: "Validation failed", errors });
    }
    next(error);
  }
};
