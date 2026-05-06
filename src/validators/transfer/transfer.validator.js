const { body, param, query } = require('express-validator');

// At least one recipient identifier must be provided
const recipientChain = [
  body('toAccountNumber').optional().trim().isString().isLength({ min: 6, max: 20 }),
  body('toPhone').optional().trim().isString().isLength({ min: 7, max: 15 }),
  body('toEmail').optional().trim().isEmail().normalizeEmail(),
  body('beneficiaryId').optional().isUUID().withMessage('Invalid beneficiary ID'),
  body().custom((value) => {
    const { toAccountNumber, toPhone, toEmail, beneficiaryId } = value || {};
    if (!toAccountNumber && !toPhone && !toEmail && !beneficiaryId) {
      throw new Error('Provide one of: toAccountNumber, toPhone, toEmail, or beneficiaryId');
    }
    return true;
  }),
];

const createTransfer = [
  body('fromAccountId')
    .notEmpty().withMessage('fromAccountId is required')
    .isUUID().withMessage('Invalid fromAccountId'),
  body('amount')
    .notEmpty().withMessage('amount is required')
    .isFloat({ gt: 0 }).withMessage('amount must be greater than 0')
    .custom((value) => {
      // Max 2 decimal places
      if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
        throw new Error('amount must have at most 2 decimal places');
      }
      return true;
    }),
  body('currency').optional().trim().isLength({ min: 3, max: 3 }).toUpperCase(),
  body('purpose').optional().trim().isLength({ max: 50 }),
  body('remarks').optional().trim().isLength({ max: 255 }),
  body('idempotencyKey').optional().trim().isLength({ min: 8, max: 100 }),
  ...recipientChain,
];

const resolveRecipient = [
  body('accountNumber').optional().trim().isString().isLength({ min: 6, max: 20 }),
  body('phone').optional().trim().isString().isLength({ min: 7, max: 15 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body().custom((value) => {
    const { accountNumber, phone, email } = value || {};
    if (!accountNumber && !phone && !email) {
      throw new Error('Provide one of: accountNumber, phone, or email');
    }
    return true;
  }),
];

const transferIdParam = [
  param('transferId').isUUID().withMessage('Invalid transfer ID'),
];

const listTransfers = [
  query('accountId').optional().isUUID(),
  query('status').optional().isIn(['PENDING', 'SUCCESS', 'FAILED', 'REVERSED']),
  query('direction').optional().isIn(['DEBIT', 'CREDIT']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
];

const addBeneficiary = [
  body('accountNumber').optional().trim().isString().isLength({ min: 6, max: 20 }),
  body('phone').optional().trim().isString().isLength({ min: 7, max: 15 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('nickname').optional().trim().isLength({ max: 100 }),
  body().custom((value) => {
    const { accountNumber, phone, email } = value || {};
    if (!accountNumber && !phone && !email) {
      throw new Error('Provide one of: accountNumber, phone, or email');
    }
    return true;
  }),
];

const beneficiaryIdParam = [
  param('beneficiaryId').isUUID().withMessage('Invalid beneficiary ID'),
];

module.exports = {
  createTransfer,
  resolveRecipient,
  transferIdParam,
  listTransfers,
  addBeneficiary,
  beneficiaryIdParam,
};
