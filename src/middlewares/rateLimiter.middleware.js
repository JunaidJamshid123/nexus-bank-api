const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Auth - public endpoints (stricter)
const authLimiter = createLimiter(60 * 1000, 5, 'Too many attempts, please try again after 1 minute');

// Login / MPIN reset - very strict
const loginLimiter = createLimiter(60 * 1000, 4, 'Too many login attempts, please try again after 1 minute');

// Protected endpoints - general
const apiLimiter = createLimiter(60 * 1000, 5, 'Too many requests, please try again after 1 minute');

// Sensitive mutations (password/mpin change, delete)
const sensitiveLimiter = createLimiter(60 * 1000, 4, 'Too many requests, please try again after 1 minute');

module.exports = { authLimiter, loginLimiter, apiLimiter, sensitiveLimiter };
