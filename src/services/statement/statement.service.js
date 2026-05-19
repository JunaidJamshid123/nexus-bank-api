const { Op } = require('sequelize');
const { BankAccount } = require('../../models/account');
const { Transaction } = require('../../models/transfer');
const { User } = require('../../models/auth');
const ApiError = require('../../utils/ApiError');

// ─── CONSTANTS ─────────────────────────────────────────────
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// ─── HELPERS ───────────────────────────────────────────────
const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  return `${accountNumber.slice(0, 3)}${'•'.repeat(accountNumber.length - 7)}${last4}`;
};

const maskHolderName = (name) => {
  if (!name) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

/**
 * Resolve and normalise the date range. Defaults to last 30 days.
 * `to` is treated as end-of-day (23:59:59.999 UTC).
 */
const resolveRange = (fromInput, toInput) => {
  const now = new Date();

  let to = toInput ? new Date(toInput) : new Date(now);
  let from = fromInput ? new Date(fromInput) : new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new ApiError(400, 'Invalid date range');
  }
  if (from > to) {
    throw new ApiError(400, '`from` must be before `to`');
  }

  // Expand `to` to end of day so the entire day is included
  to.setHours(23, 59, 59, 999);

  const diffDays = (to - from) / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_RANGE_DAYS) {
    throw new ApiError(400, `Date range cannot exceed ${MAX_RANGE_DAYS} days`);
  }

  return { from, to };
};

/**
 * Authorize: ensure the account exists and belongs to the requesting user.
 */
const getOwnedAccount = async (userId, accountId) => {
  const account = await BankAccount.findOne({ where: { id: accountId, userId } });
  if (!account) throw new ApiError(404, 'Account not found');
  return account;
};

/**
 * Compute opening balance: runningBalance of the latest transaction strictly before `from`.
 * Falls back to 0 if there are no prior transactions.
 */
const computeOpeningBalance = async (accountId, from) => {
  const prior = await Transaction.findOne({
    where: {
      accountId,
      status: 'SUCCESS',
      createdAt: { [Op.lt]: from },
    },
    order: [['createdAt', 'DESC']],
    attributes: ['runningBalance'],
  });
  return prior ? Number(prior.runningBalance) : 0;
};

/**
 * Aggregate totals over the date range (credits, debits, net, count).
 */
const computeTotals = async (accountId, from, to) => {
  const rows = await Transaction.findAll({
    where: {
      accountId,
      status: 'SUCCESS',
      createdAt: { [Op.between]: [from, to] },
    },
    attributes: ['direction', 'amount', 'fee'],
    raw: true,
  });

  let totalCredits = 0;
  let totalDebits = 0;
  let totalFees = 0;

  for (const r of rows) {
    const amt = Number(r.amount);
    const fee = Number(r.fee || 0);
    if (r.direction === 'CREDIT') totalCredits += amt;
    else if (r.direction === 'DEBIT') totalDebits += amt + fee;
    totalFees += fee;
  }

  return {
    totalCredits: +totalCredits.toFixed(2),
    totalDebits: +totalDebits.toFixed(2),
    totalFees: +totalFees.toFixed(2),
    net: +(totalCredits - totalDebits).toFixed(2),
    count: rows.length,
  };
};

/**
 * Closing balance = opening + credits − debits (using totals).
 */
const computeClosingBalance = (opening, totals) =>
  +(opening + totals.totalCredits - totals.totalDebits).toFixed(2);

/**
 * Format a transaction row for statement output.
 */
const formatTxnForStatement = (txn) => ({
  id: txn.id,
  referenceNumber: txn.referenceNumber,
  date: txn.createdAt,
  completedAt: txn.completedAt,
  direction: txn.direction,
  transferType: txn.transferType,
  amount: Number(txn.amount),
  fee: Number(txn.fee || 0),
  netAmount: Number(txn.netAmount),
  currency: txn.currency,
  runningBalance: Number(txn.runningBalance),
  status: txn.status,
  counterpartyAccountNumberMasked: maskAccountNumber(txn.counterpartyAccountNumber),
  counterpartyName: maskHolderName(txn.counterpartyName),
  purpose: txn.purpose,
  remarks: txn.remarks,
});

// ─── PUBLIC: GET STATEMENT (paginated JSON) ────────────────
const getStatement = async (userId, accountId, query = {}) => {
  const account = await getOwnedAccount(userId, accountId);
  const { from, to } = resolveRange(query.from, query.to);

  const limit = Math.min(Number(query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const page = Math.max(Number(query.page) || 1, 1);
  const offset = (page - 1) * limit;

  const where = {
    accountId: account.id,
    status: 'SUCCESS',
    createdAt: { [Op.between]: [from, to] },
  };

  const [openingBalance, totals, { rows, count }] = await Promise.all([
    computeOpeningBalance(account.id, from),
    computeTotals(account.id, from, to),
    Transaction.findAndCountAll({
      where,
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
      limit,
      offset,
    }),
  ]);

  const closingBalance = computeClosingBalance(openingBalance, totals);

  const holder = await User.findByPk(account.userId, {
    attributes: ['fullName', 'email', 'phone'],
  });

  return {
    account: {
      id: account.id,
      accountNumberMasked: maskAccountNumber(account.accountNumber),
      accountType: account.accountType,
      currency: account.currency,
      status: account.status,
      holderName: holder ? holder.fullName : null,
    },
    period: { from, to },
    openingBalance,
    closingBalance,
    currentBalance: Number(account.balance),
    summary: totals,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
    transactions: rows.map(formatTxnForStatement),
  };
};

// ─── PUBLIC: STATEMENT SUMMARY ─────────────────────────────
const getStatementSummary = async (userId, accountId, query = {}) => {
  const account = await getOwnedAccount(userId, accountId);
  const { from, to } = resolveRange(query.from, query.to);

  const [openingBalance, totals] = await Promise.all([
    computeOpeningBalance(account.id, from),
    computeTotals(account.id, from, to),
  ]);

  return {
    accountId: account.id,
    accountNumberMasked: maskAccountNumber(account.accountNumber),
    currency: account.currency,
    period: { from, to },
    openingBalance,
    closingBalance: computeClosingBalance(openingBalance, totals),
    ...totals,
  };
};

/**
 * Fetch full (unpaginated) data for downloads. Hard-caps at MAX_DOWNLOAD_ROWS.
 */
const MAX_DOWNLOAD_ROWS = 5000;

const getStatementForDownload = async (userId, accountId, query = {}) => {
  const account = await getOwnedAccount(userId, accountId);
  const { from, to } = resolveRange(query.from, query.to);

  const [openingBalance, totals, rows, holder] = await Promise.all([
    computeOpeningBalance(account.id, from),
    computeTotals(account.id, from, to),
    Transaction.findAll({
      where: {
        accountId: account.id,
        status: 'SUCCESS',
        createdAt: { [Op.between]: [from, to] },
      },
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
      limit: MAX_DOWNLOAD_ROWS,
    }),
    User.findByPk(account.userId, { attributes: ['fullName', 'email', 'phone'] }),
  ]);

  return {
    account: {
      id: account.id,
      accountNumber: account.accountNumber,
      accountNumberMasked: maskAccountNumber(account.accountNumber),
      accountType: account.accountType,
      currency: account.currency,
      status: account.status,
      holderName: holder ? holder.fullName : null,
      holderEmail: holder ? holder.email : null,
      holderPhone: holder ? holder.phone : null,
    },
    period: { from, to },
    openingBalance,
    closingBalance: computeClosingBalance(openingBalance, totals),
    currentBalance: Number(account.balance),
    summary: totals,
    transactions: rows.map(formatTxnForStatement),
    truncated: rows.length >= MAX_DOWNLOAD_ROWS,
  };
};

module.exports = {
  getStatement,
  getStatementSummary,
  getStatementForDownload,
};
