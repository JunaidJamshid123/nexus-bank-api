const { BankAccount } = require('../../models/account');
const { User } = require('../../models/auth');
const ApiError = require('../../utils/ApiError');

// ─── CREATE ACCOUNT (used during signup & standalone) ──────
const createAccount = async ({ userId, accountType = 'SAVINGS', currency = 'PKR' }) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const accountNumber = await BankAccount.generateAccountNumber();

  const account = await BankAccount.create({
    userId,
    accountNumber,
    accountType,
    currency,
  });

  return {
    id: account.id,
    accountNumber: account.accountNumber,
    accountType: account.accountType,
    balance: account.balance,
    currency: account.currency,
    status: account.status,
    createdAt: account.createdAt,
  };
};

// ─── GET ALL ACCOUNTS FOR A USER ───────────────────────────
const getAccounts = async (userId) => {
  const accounts = await BankAccount.findAll({
    where: { userId },
    attributes: ['id', 'accountNumber', 'accountType', 'balance', 'currency', 'status', 'createdAt'],
    order: [['createdAt', 'ASC']],
  });

  return accounts;
};

// ─── GET SINGLE ACCOUNT ───────────────────────────────────
const getAccountById = async (userId, accountId) => {
  const account = await BankAccount.findOne({
    where: { id: accountId, userId },
    attributes: ['id', 'accountNumber', 'accountType', 'balance', 'currency', 'status', 'createdAt', 'updatedAt'],
  });

  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  return account;
};

// ─── GET ACCOUNT BY ACCOUNT NUMBER ─────────────────────────
const getAccountByNumber = async (userId, accountNumber) => {
  const account = await BankAccount.findOne({
    where: { accountNumber, userId },
    attributes: ['id', 'accountNumber', 'accountType', 'balance', 'currency', 'status', 'createdAt', 'updatedAt'],
  });

  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  return account;
};

// ─── DELETE SINGLE ACCOUNT (close) ─────────────────────────
const deleteAccount = async (userId, accountId) => {
  const account = await BankAccount.findOne({ where: { id: accountId, userId } });
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
  if (parseFloat(account.balance) !== 0) {
    throw new ApiError(400, 'Account balance must be zero before closing');
  }
  await account.update({ status: 'CLOSED' });
  await account.destroy();
  return { message: 'Account closed successfully' };
};

// ─── UPDATE ACCOUNT STATUS ─────────────────────────────────
const updateAccountStatus = async (userId, accountId, status) => {
  const account = await BankAccount.findOne({ where: { id: accountId, userId } });
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
  if (account.status === 'CLOSED') {
    throw new ApiError(400, 'Cannot update a closed account');
  }
  await account.update({ status });
  return {
    id: account.id,
    accountNumber: account.accountNumber,
    status: account.status,
  };
};

// ─── GET ACCOUNT BALANCE ───────────────────────────────────
const getBalance = async (userId, accountId) => {
  const account = await BankAccount.findOne({
    where: { id: accountId, userId },
    attributes: ['id', 'accountNumber', 'balance', 'currency', 'status'],
  });
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
  return account;
};

// ─── DELETE ALL ACCOUNTS FOR A USER ────────────────────────
const deleteAllAccounts = async (userId) => {
  const deleted = await BankAccount.destroy({ where: { userId } });
  return { deletedCount: deleted };
};

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
