import { formatZodIssues } from './http.js';

// Validate + normalize req.body against a zod schema. On success, replaces
// req.body with the parsed (coerced, stripped) value; on failure, 400 with
// field-level issues. Used as route middleware: validate(createContactSchema).
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ error: 'Validation failed.', issues: formatZodIssues(result.error) });
  }
  req.body = result.data;
  next();
};
