const { body, param } = require('express-validator');

const createAccount = [
  body('accountType')
    .optional()
    .isIn(['SAVINGS', 'CURRENT']).withMessage('Account type must be SAVINGS or CURRENT'),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code')
    .isAlpha().withMessage('Currency must contain only letters')
    .toUpperCase(),
];

const getAccountById = [
  param('accountId')
    .isUUID().withMessage('Invalid account ID'),
];

const getAccountByNumber = [
  param('accountNumber')
    .trim()
    .notEmpty().withMessage('Account number is required'),
];

const updateAccountStatus = [
  param('accountId')
    .isUUID().withMessage('Invalid account ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['ACTIVE', 'INACTIVE', 'FROZEN']).withMessage('Status must be ACTIVE, INACTIVE, or FROZEN'),
];

module.exports = {
  createAccount,
  getAccountById,
  getAccountByNumber,
  updateAccountStatus,
};
