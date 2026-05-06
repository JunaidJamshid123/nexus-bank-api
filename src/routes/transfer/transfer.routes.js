const express = require('express');
const router = express.Router();
const transferController = require('../../controllers/transfer/transfer.controller');
const transferValidator = require('../../validators/transfer/transfer.validator');
const validate = require('../../middlewares/validate.middleware');
const auth = require('../../middlewares/auth/auth.middleware');
const { apiLimiter, sensitiveLimiter } = require('../../middlewares/rateLimiter.middleware');

// All transfer routes are protected
router.use(auth);

// ─── BENEFICIARIES (defined before /:transferId to avoid conflicts) ────
// POST /api/transfer/beneficiary
router.post(
  '/beneficiary',
  sensitiveLimiter,
  transferValidator.addBeneficiary,
  validate,
  transferController.addBeneficiary
);

// GET /api/transfer/beneficiary
router.get('/beneficiary', apiLimiter, transferController.listBeneficiaries);

// DELETE /api/transfer/beneficiary/:beneficiaryId
router.delete(
  '/beneficiary/:beneficiaryId',
  sensitiveLimiter,
  transferValidator.beneficiaryIdParam,
  validate,
  transferController.deleteBeneficiary
);

// ─── RECIPIENT RESOLUTION ──────────────────────────────────
// POST /api/transfer/resolve-recipient
router.post(
  '/resolve-recipient',
  apiLimiter,
  transferValidator.resolveRecipient,
  validate,
  transferController.resolveRecipient
);

// ─── TRANSFERS ─────────────────────────────────────────────
// POST /api/transfer  - execute transfer
router.post(
  '/',
  sensitiveLimiter,
  transferValidator.createTransfer,
  validate,
  transferController.createTransfer
);

// GET /api/transfer  - list user's transfers
router.get(
  '/',
  apiLimiter,
  transferValidator.listTransfers,
  validate,
  transferController.listTransfers
);

// GET /api/transfer/:transferId  - get one transfer
router.get(
  '/:transferId',
  apiLimiter,
  transferValidator.transferIdParam,
  validate,
  transferController.getTransfer
);

module.exports = router;
