/**
 * Custom Response Envelope Utility
 * Enforces uniform JSON response schema across all endpoints:
 * { success: boolean, message: string, data: any }
 */

/**
 * Dispatches a successful HTTP response with standard payload envelope
 * @param {import('express').Response} res - Express response object
 * @param {number} httpStatusCode - HTTP status code (200, 201)
 * @param {string} informationalMessage - Human-readable success message
 * @param {any} [payload=null] - Accompanying response data
 */
export const dispatchStandardSuccess = (res, httpStatusCode, informationalMessage, payload = null) => {
  return res.status(httpStatusCode).json({
    success: true,
    message: informationalMessage,
    data: payload
  });
};

/**
 * Dispatches an error HTTP response with standard envelope
 * @param {import('express').Response} res - Express response object
 * @param {number} httpStatusCode - HTTP status code (400, 404, 409, 500)
 * @param {string} diagnosticMessage - Human-readable error description
 * @param {any} [errorDetails=null] - Optional auxiliary debugging metadata or field issues
 */
export const dispatchStandardError = (res, httpStatusCode, diagnosticMessage, errorDetails = null) => {
  return res.status(httpStatusCode).json({
    success: false,
    message: diagnosticMessage,
    data: errorDetails
  });
};
