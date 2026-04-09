export const formatZodErrors = (error) => {
  const errors = error.issues.map((issue) => {
    let { origin, code, message, path } = issue;
    if ("invalid_type" === code) {
      message = `This field is required.`;
    }
    return { origin: origin || "unknown", code, message, path };
  });

  return errors;
};

