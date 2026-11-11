/**
 * Generic Zod validation middleware.
 * Usage: router.post('/route', validate(myZodSchema), controller)
 * Returns 400 with field-level errors if validation fails.
 */
import { sendBadRequest } from '../utils/apiResponse.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return sendBadRequest(res, 'Validation failed', errors);
  }

  // Replace req.body with parsed (sanitized/coerced) data
  req.body = result.data;
  next();
};
