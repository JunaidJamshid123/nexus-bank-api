const express = require('express');
const router = express.Router();
const accountController = require('../../controllers/account/account.controller');
const accountValidator = require('../../validators/account/account.validator');
const validate = require('../../middlewares/validate.middleware');
const auth = require('../../middlewares/auth/auth.middleware');
const { apiLimiter, sensitiveLimiter } = require('../../middlewares/rateLimiter.middleware');

// All account routes are protected
router.use(auth);

// POST   /api/account              - Create a new bank account
router.post('/', apiLimiter, accountValidator.createAccount, validate, accountController.createAccount);

// GET    /api/account              - Get all accounts for logged-in user
router.get('/', apiLimiter, accountController.getAccounts);

// GET    /api/account/number/:accountNumber - Get account by account number
router.get('/number/:accountNumber', apiLimiter, accountValidator.getAccountByNumber, validate, accountController.getAccountByNumber);

// GET    /api/account/:accountId/balance - Quick balance inquiry
router.get('/:accountId/balance', apiLimiter, accountValidator.getAccountById, validate, accountController.getBalance);

// GET    /api/account/:accountId   - Get account by ID
router.get('/:accountId', apiLimiter, accountValidator.getAccountById, validate, accountController.getAccountById);

// PUT    /api/account/:accountId/status - Freeze/activate account
router.put('/:accountId/status', sensitiveLimiter, accountValidator.updateAccountStatus, validate, accountController.updateAccountStatus);

// DELETE /api/account/:accountId   - Close single account
router.delete('/:accountId', sensitiveLimiter, accountValidator.getAccountById, validate, accountController.deleteAccount);

// DELETE /api/account              - Delete all accounts for logged-in user
router.delete('/', sensitiveLimiter, accountController.deleteAllAccounts);

module.exports = router;
