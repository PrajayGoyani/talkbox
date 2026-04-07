import { ZodType, ZodError, z } from "zod";
import { formatZodErrors } from "../utils/helper.js";

/**
 * @param {ZodType} schema
 */
export const validate = (schema) => (req, res, next) => {
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
