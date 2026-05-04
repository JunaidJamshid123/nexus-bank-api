const catchAsync = require('../../utils/catchAsync');
const accountService = require('../../services/account/account.service');

// POST /api/account
const createAccount = catchAsync(async (req, res) => {
  const account = await accountService.createAccount({
    userId: req.user.id,
    accountType: req.body.accountType,
    currency: req.body.currency,
  });
  res.status(201).json({ success: true, message: 'Account created successfully', data: account });
});

// GET /api/account
const getAccounts = catchAsync(async (req, res) => {
  const accounts = await accountService.getAccounts(req.user.id);
  res.json({ success: true, data: accounts });
});

// GET /api/account/:accountId
const getAccountById = catchAsync(async (req, res) => {
  const account = await accountService.getAccountById(req.user.id, req.params.accountId);
  res.json({ success: true, data: account });
});

// GET /api/account/number/:accountNumber
const getAccountByNumber = catchAsync(async (req, res) => {
  const account = await accountService.getAccountByNumber(req.user.id, req.params.accountNumber);
  res.json({ success: true, data: account });
});

// DELETE /api/account/:accountId
const deleteAccount = catchAsync(async (req, res) => {
  const result = await accountService.deleteAccount(req.user.id, req.params.accountId);
  res.json({ success: true, message: 'Account closed successfully', data: result });
});

// PUT /api/account/:accountId/status
const updateAccountStatus = catchAsync(async (req, res) => {
  const result = await accountService.updateAccountStatus(req.user.id, req.params.accountId, req.body.status);
  res.json({ success: true, message: 'Account status updated', data: result });
});

// GET /api/account/:accountId/balance
const getBalance = catchAsync(async (req, res) => {
  const balance = await accountService.getBalance(req.user.id, req.params.accountId);
  res.json({ success: true, data: balance });
});

// DELETE /api/account
const deleteAllAccounts = catchAsync(async (req, res) => {
  const result = await accountService.deleteAllAccounts(req.user.id);
  res.json({ success: true, message: 'All accounts deleted', data: result });
});

module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  getAccountByNumber,
  deleteAccount,
  updateAccountStatus,
  getBalance,
  deleteAllAccounts,
};
