const catchAsync = require('../../utils/catchAsync');
const transferService = require('../../services/transfer/transfer.service');

// POST /api/transfer/resolve-recipient
const resolveRecipient = catchAsync(async (req, res) => {
  const data = await transferService.resolveRecipientPreview(req.user.id, {
    accountNumber: req.body.accountNumber,
    phone: req.body.phone,
    email: req.body.email,
  });
  res.json({ success: true, data });
});

// POST /api/transfer
const createTransfer = catchAsync(async (req, res) => {
  const data = await transferService.createTransfer({
    userId: req.user.id,
    fromAccountId: req.body.fromAccountId,
    toAccountNumber: req.body.toAccountNumber,
    toPhone: req.body.toPhone,
    toEmail: req.body.toEmail,
    beneficiaryId: req.body.beneficiaryId,
    amount: req.body.amount,
    currency: req.body.currency,
    purpose: req.body.purpose,
    remarks: req.body.remarks,
    idempotencyKey: req.body.idempotencyKey || req.header('Idempotency-Key'),
    ipAddress: req.ip,
    deviceId: req.deviceId,
  });
  res.status(201).json({ success: true, message: 'Transfer completed successfully', data });
});

// GET /api/transfer
const listTransfers = catchAsync(async (req, res) => {
  const data = await transferService.listTransfers(req.user.id, {
    accountId: req.query.accountId,
    status: req.query.status,
    direction: req.query.direction,
    from: req.query.from,
    to: req.query.to,
    limit: req.query.limit,
    offset: req.query.offset,
  });
  res.json({ success: true, data });
});

// GET /api/transfer/:transferId
const getTransfer = catchAsync(async (req, res) => {
  const data = await transferService.getTransferById(req.user.id, req.params.transferId);
  res.json({ success: true, data });
});

// POST /api/transfer/beneficiary
const addBeneficiary = catchAsync(async (req, res) => {
  const data = await transferService.addBeneficiary(req.user.id, {
    accountNumber: req.body.accountNumber,
    phone: req.body.phone,
    email: req.body.email,
    nickname: req.body.nickname,
  });
  res.status(201).json({ success: true, message: 'Beneficiary added', data });
});

// GET /api/transfer/beneficiary
const listBeneficiaries = catchAsync(async (req, res) => {
  const data = await transferService.listBeneficiaries(req.user.id);
  res.json({ success: true, data });
});

// DELETE /api/transfer/beneficiary/:beneficiaryId
const deleteBeneficiary = catchAsync(async (req, res) => {
  const data = await transferService.deleteBeneficiary(req.user.id, req.params.beneficiaryId);
  res.json({ success: true, message: 'Beneficiary removed', data });
});

module.exports = {
  resolveRecipient,
  createTransfer,
  listTransfers,
  getTransfer,
  addBeneficiary,
  listBeneficiaries,
  deleteBeneficiary,
};
