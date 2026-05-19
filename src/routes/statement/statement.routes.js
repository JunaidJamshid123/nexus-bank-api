const express = require('express');
const router = express.Router();
const statementController = require('../../controllers/statement/statement.controller');
const statementValidator = require('../../validators/statement/statement.validator');
const validate = require('../../middlewares/validate.middleware');
const auth = require('../../middlewares/auth/auth.middleware');
const { apiLimiter, sensitiveLimiter } = require('../../middlewares/rateLimiter.middleware');

// All statement routes are protected
router.use(auth);

// GET /api/statement/:accountId/summary — totals only
router.get(
  '/:accountId/summary',
  apiLimiter,
  statementValidator.getStatementSummary,
  validate,
  statementController.getStatementSummary
);

// GET /api/statement/:accountId/download?format=pdf|csv|json
router.get(
  '/:accountId/download',
  sensitiveLimiter,
  statementValidator.downloadStatement,
  validate,
  statementController.downloadStatement
);

// GET /api/statement/:accountId — paginated JSON statement
router.get(
  '/:accountId',
  apiLimiter,
  statementValidator.getStatement,
  validate,
  statementController.getStatement
);

module.exports = router;
