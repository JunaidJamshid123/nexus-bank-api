const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth/auth.controller');
const authValidator = require('../../validators/auth/auth.validator');
const validate = require('../../middlewares/validate.middleware');
const auth = require('../../middlewares/auth/auth.middleware');
const { authLimiter, loginLimiter, apiLimiter, sensitiveLimiter } = require('../../middlewares/rateLimiter.middleware');

// ─── PUBLIC ROUTES ─────────────────────────────────────────
router.post('/register', authLimiter, authValidator.register, validate, authController.register);
router.get('/check-phone/:phone', authLimiter, authValidator.checkPhone, validate, authController.checkPhone);
router.post('/login', loginLimiter, authValidator.login, validate, authController.login);
router.post('/token/refresh', authLimiter, authValidator.refreshToken, validate, authController.refreshToken);
router.post('/mpin/reset', loginLimiter, authValidator.resetMpin, validate, authController.resetMpin);

// ─── PROTECTED ROUTES (require access token) ──────────────
router.use(auth);
router.post('/logout', apiLimiter, authController.logout);
router.get('/sessions', apiLimiter, authController.getSessions);
router.delete('/sessions/:sessionId', apiLimiter, authValidator.deleteSession, validate, authController.deleteSession);
router.put('/mpin/change', sensitiveLimiter, authValidator.changeMpin, validate, authController.changeMpin);
router.put('/password/change', sensitiveLimiter, authValidator.changePassword, validate, authController.changePassword);
router.get('/me', apiLimiter, authController.getMe);
router.get('/users', apiLimiter, authController.getAllUsers);

module.exports = router;
