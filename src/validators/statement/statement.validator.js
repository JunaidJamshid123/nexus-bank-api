const { param, query } = require('express-validator');

const accountIdParam = [
  param('accountId').isUUID().withMessage('Invalid account ID'),
];

const dateRangeQuery = [
  query('from').optional().isISO8601().withMessage('`from` must be an ISO date'),
  query('to').optional().isISO8601().withMessage('`to` must be an ISO date'),
];

const getStatement = [
  ...accountIdParam,
  ...dateRangeQuery,
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100').toInt(),
];

const getStatementSummary = [
  ...accountIdParam,
  ...dateRangeQuery,
];

const downloadStatement = [
  ...accountIdParam,
  ...dateRangeQuery,
  query('format').optional().isIn(['pdf', 'csv', 'json'])
    .withMessage('format must be pdf, csv, or json'),
];

module.exports = {
  getStatement,
  getStatementSummary,
  downloadStatement,
};
