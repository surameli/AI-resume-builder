/**
 * Standardized API response helpers.
 * Every endpoint uses these so the frontend always gets a consistent shape:
 *   { success, message, data }  or  { success, message, errors }
 */

export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendCreated = (res, data = null, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

export const sendError = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

export const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, message, 401);
};

export const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, message, 403);
};

export const sendNotFound = (res, message = 'Not found') => {
  return sendError(res, message, 404);
};

export const sendBadRequest = (res, message = 'Bad request', errors = null) => {
  return sendError(res, message, 400, errors);
};

export const sendConflict = (res, message = 'Conflict') => {
  return sendError(res, message, 409);
};

export const sendTooManyRequests = (res, message = 'Too many requests') => {
  return sendError(res, message, 429);
};
