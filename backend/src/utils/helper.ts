import { ZodError } from "zod";

export const formatZodErrors = (error: ZodError | any) => {
  if (!error.issues) return [];
  const errors = error.issues.map((issue: any) => {
    let { origin, code, message, path } = issue;
    if ("invalid_type" === code) {
      message = `This field is required.`;
    }
    return { origin: origin || "unknown", code, message, path };
  });

  return errors;
};

