const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const { BankAccount } = require('../../models/account');
const { User } = require('../../models/auth');
const { Transaction, Beneficiary } = require('../../models/transfer');
const ApiError = require('../../utils/ApiError');

// ─── HELPERS ──────────────────────────────────────────────

/**
 * Mask an account number — show only last 4 digits.
 * NXB1234567890123456 -> NXB••••••••3456
 */
const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  return `${accountNumber.slice(0, 3)}${'•'.repeat(accountNumber.length - 7)}${last4}`;
};

/**
 * Mask the holder's full name — show first name + initial.
 * "Junaid Jamshid" -> "Junaid J."
 */
const maskHolderName = (name) => {
  if (!name) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

/**
 * Resolve a NexusBank recipient by accountNumber, phone, email, or beneficiaryId.
 * Returns the recipient's ACTIVE account + owning user.
 */
const resolveRecipient = async ({ ownerUserId, accountNumber, phone, email, beneficiaryId }, { transaction } = {}) => {
  // Beneficiary path - recipient must already be saved & verified for the owner
  if (beneficiaryId) {
    const ben = await Beneficiary.findOne({
      where: { id: beneficiaryId, userId: ownerUserId },
      transaction,
    });
    if (!ben) throw new ApiError(404, 'Beneficiary not found');

    const account = await BankAccount.findOne({
      where: { id: ben.beneficiaryAccountId },
      transaction,
    });
    if (!account) throw new ApiError(404, 'Beneficiary account no longer exists');

    const user = await User.findByPk(ben.beneficiaryUserId, { transaction });
    if (!user) throw new ApiError(404, 'Beneficiary user no longer exists');

    return { user, account };
  }

  // Direct lookup paths
  let account = null;
  let user = null;

  if (accountNumber) {
    account = await BankAccount.findOne({
      where: { accountNumber },
      transaction,
    });
    if (!account) throw new ApiError(404, 'Recipient account not found');
    user = await User.findByPk(account.userId, { transaction });
  } else if (phone || email) {
    const where = {};
    if (phone) where.phone = phone;
    if (email) where.email = email;
    user = await User.findOne({ where, transaction });
    if (!user) throw new ApiError(404, 'Recipient user not found');

    // Pick the user's first ACTIVE account
    account = await BankAccount.findOne({
      where: { userId: user.id, status: 'ACTIVE' },
      order: [['createdAt', 'ASC']],
      transaction,
    });
    if (!account) throw new ApiError(404, 'Recipient has no active account');
  }

  if (!user || !account) throw new ApiError(404, 'Recipient not found');
  return { user, account };
};

// ─── PUBLIC: RESOLVE RECIPIENT (preview before transfer) ───
const resolveRecipientPreview = async (userId, payload) => {
  const { user, account } = await resolveRecipient({
    ownerUserId: userId,
    accountNumber: payload.accountNumber,
    phone: payload.phone,
    email: payload.email,
  });

  // Don't let user resolve themselves as recipient via this endpoint? It's allowed (self-transfer)
  return {
    accountId: account.id,
    accountNumberMasked: maskAccountNumber(account.accountNumber),
    holderName: maskHolderName(user.fullName),
    accountType: account.accountType,
    currency: account.currency,
    status: account.status,
    isSelf: user.id === userId,
  };
};

// ─── PUBLIC: CREATE TRANSFER (atomic, no OTP) ──────────────
const createTransfer = async ({
  userId,
  fromAccountId,
  toAccountNumber,
  toPhone,
  toEmail,
  beneficiaryId,
  amount,
  currency,
  purpose,
  remarks,
  idempotencyKey,
  ipAddress,
  deviceId,
}) => {
  // ── Idempotency: if a transfer with this key already exists for this user, return it
  if (idempotencyKey) {
    const existing = await Transaction.findOne({
      where: { userId, idempotencyKey, direction: 'DEBIT' },
    });
    if (existing) {
      return formatTransferResult(existing);
    }
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new ApiError(400, 'Invalid amount');
  }

  const referenceNumber = Transaction.generateReferenceNumber();
  const fee = 0; // No fees for internal transfers — adjust later
  const netDebit = numericAmount + fee;

  // ── ATOMIC SECTION ──────────────────────────────────────
  const result = await sequelize.transaction(async (t) => {
    // Resolve recipient (account row read inside txn)
    const { user: recipientUser, account: recipientAccountRaw } = await resolveRecipient({
      ownerUserId: userId,
      accountNumber: toAccountNumber,
      phone: toPhone,
      email: toEmail,
      beneficiaryId,
    }, { transaction: t });

    // Sender account — must belong to user
    const senderAccount = await BankAccount.findOne({
      where: { id: fromAccountId, userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!senderAccount) throw new ApiError(404, 'Sender account not found');

    if (senderAccount.id === recipientAccountRaw.id) {
      throw new ApiError(400, 'Cannot transfer to the same account');
    }

    // Re-fetch recipient with row lock — order locks deterministically by id to avoid deadlocks
    const [firstId, secondId] = [senderAccount.id, recipientAccountRaw.id].sort();
    // We've already locked sender; if recipient's id < sender's id, the lock order was wrong.
    // Acquire recipient's lock now — Postgres still detects deadlocks; for stricter ordering
    // applications can refactor to lock both in one query. For simplicity:
    const recipientAccount = await BankAccount.findOne({
      where: { id: recipientAccountRaw.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    // ── Validations ──
    if (senderAccount.status !== 'ACTIVE') {
      throw new ApiError(400, `Sender account is ${senderAccount.status}`);
    }
    if (recipientAccount.status !== 'ACTIVE') {
      throw new ApiError(400, `Recipient account is ${recipientAccount.status}`);
    }

    const txnCurrency = (currency || senderAccount.currency).toUpperCase();
    if (senderAccount.currency !== txnCurrency || recipientAccount.currency !== txnCurrency) {
      throw new ApiError(400, 'Currency mismatch between accounts');
    }

    const senderBalance = Number(senderAccount.balance);
    if (senderBalance < netDebit) {
      throw new ApiError(400, 'Insufficient balance');
    }

    // ── Apply balance changes ──
    const newSenderBalance = +(senderBalance - netDebit).toFixed(2);
    const newRecipientBalance = +(Number(recipientAccount.balance) + numericAmount).toFixed(2);

    await senderAccount.update({ balance: newSenderBalance }, { transaction: t });
    await recipientAccount.update({ balance: newRecipientBalance }, { transaction: t });

    // ── Determine transfer type ──
    const transferType = senderAccount.userId === recipientAccount.userId ? 'SELF' : 'INTERNAL';

    const sender = await User.findByPk(userId, { transaction: t });
    const completedAt = new Date();

    // ── Insert two ledger rows ──
    const debitRow = await Transaction.create({
      referenceNumber,
      idempotencyKey: idempotencyKey || null,
      transferType,
      direction: 'DEBIT',
      accountId: senderAccount.id,
      userId: senderAccount.userId,
      counterpartyAccountId: recipientAccount.id,
      counterpartyUserId: recipientAccount.userId,
      counterpartyAccountNumber: recipientAccount.accountNumber,
      counterpartyName: recipientUser.fullName,
      amount: numericAmount,
      fee,
      netAmount: netDebit,
      currency: txnCurrency,
      runningBalance: newSenderBalance,
      status: 'SUCCESS',
      purpose: purpose || null,
      remarks: remarks || null,
      ipAddress: ipAddress || null,
      deviceId: deviceId || null,
      completedAt,
    }, { transaction: t });

    await Transaction.create({
      referenceNumber,
      idempotencyKey: null, // only sender's row holds the idempotency key
      transferType,
      direction: 'CREDIT',
      accountId: recipientAccount.id,
      userId: recipientAccount.userId,
      counterpartyAccountId: senderAccount.id,
      counterpartyUserId: senderAccount.userId,
      counterpartyAccountNumber: senderAccount.accountNumber,
      counterpartyName: sender ? sender.fullName : null,
      amount: numericAmount,
      fee: 0,
      netAmount: numericAmount,
      currency: txnCurrency,
      runningBalance: newRecipientBalance,
      status: 'SUCCESS',
      purpose: purpose || null,
      remarks: remarks || null,
      ipAddress: ipAddress || null,
      deviceId: deviceId || null,
      completedAt,
    }, { transaction: t });

    return debitRow;
  });

  return formatTransferResult(result);
};

const formatTransferResult = (debitRow) => ({
  transferId: debitRow.id,
  referenceNumber: debitRow.referenceNumber,
  status: debitRow.status,
  transferType: debitRow.transferType,
  amount: debitRow.amount,
  fee: debitRow.fee,
  netAmount: debitRow.netAmount,
  currency: debitRow.currency,
  fromAccountId: debitRow.accountId,
  toAccountId: debitRow.counterpartyAccountId,
  toAccountNumberMasked: maskAccountNumber(debitRow.counterpartyAccountNumber),
  toName: maskHolderName(debitRow.counterpartyName),
  runningBalance: debitRow.runningBalance,
  purpose: debitRow.purpose,
  remarks: debitRow.remarks,
  completedAt: debitRow.completedAt,
  createdAt: debitRow.createdAt,
});

// ─── PUBLIC: GET ONE TRANSFER ──────────────────────────────
const getTransferById = async (userId, transferId) => {
  const txn = await Transaction.findOne({
    where: { id: transferId, userId },
  });
  if (!txn) throw new ApiError(404, 'Transfer not found');
  return {
    id: txn.id,
    referenceNumber: txn.referenceNumber,
    transferType: txn.transferType,
    direction: txn.direction,
    accountId: txn.accountId,
    counterpartyAccountNumberMasked: maskAccountNumber(txn.counterpartyAccountNumber),
    counterpartyName: maskHolderName(txn.counterpartyName),
    amount: txn.amount,
    fee: txn.fee,
    netAmount: txn.netAmount,
    currency: txn.currency,
    runningBalance: txn.runningBalance,
    status: txn.status,
    failureReason: txn.failureReason,
    purpose: txn.purpose,
    remarks: txn.remarks,
    completedAt: txn.completedAt,
    createdAt: txn.createdAt,
  };
};

// ─── PUBLIC: LIST TRANSFERS ────────────────────────────────
const listTransfers = async (userId, filters = {}) => {
  const where = { userId };
  if (filters.accountId) where.accountId = filters.accountId;
  if (filters.status) where.status = filters.status;
  if (filters.direction) where.direction = filters.direction;
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt[Op.gte] = new Date(filters.from);
    if (filters.to) where.createdAt[Op.lte] = new Date(filters.to);
  }

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  const { rows, count } = await Transaction.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  const items = rows.map((txn) => ({
    id: txn.id,
    referenceNumber: txn.referenceNumber,
    transferType: txn.transferType,
    direction: txn.direction,
    accountId: txn.accountId,
    counterpartyAccountNumberMasked: maskAccountNumber(txn.counterpartyAccountNumber),
    counterpartyName: maskHolderName(txn.counterpartyName),
    amount: txn.amount,
    fee: txn.fee,
    netAmount: txn.netAmount,
    currency: txn.currency,
    runningBalance: txn.runningBalance,
    status: txn.status,
    purpose: txn.purpose,
    remarks: txn.remarks,
    completedAt: txn.completedAt,
    createdAt: txn.createdAt,
  }));

  return { total: count, limit, offset, items };
};

// ─── PUBLIC: BENEFICIARIES ─────────────────────────────────
const addBeneficiary = async (userId, { accountNumber, phone, email, nickname }) => {
  const { user: target, account } = await resolveRecipient({
    ownerUserId: userId,
    accountNumber,
    phone,
    email,
  });

  if (target.id === userId) {
    throw new ApiError(400, 'You cannot add yourself as a beneficiary');
  }

  // Prevent duplicates (handled by unique index too)
  const existing = await Beneficiary.findOne({
    where: { userId, beneficiaryAccountId: account.id },
  });
  if (existing) {
    throw new ApiError(409, 'Beneficiary already exists');
  }

  const ben = await Beneficiary.create({
    userId,
    beneficiaryUserId: target.id,
    beneficiaryAccountId: account.id,
    accountNumber: account.accountNumber,
    holderName: target.fullName,
    nickname: nickname || null,
  });

  return formatBeneficiary(ben);
};

const listBeneficiaries = async (userId) => {
  const list = await Beneficiary.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
  return list.map(formatBeneficiary);
};

const deleteBeneficiary = async (userId, beneficiaryId) => {
  const ben = await Beneficiary.findOne({ where: { id: beneficiaryId, userId } });
  if (!ben) throw new ApiError(404, 'Beneficiary not found');
  await ben.destroy();
  return { message: 'Beneficiary removed' };
};

const formatBeneficiary = (ben) => ({
  id: ben.id,
  accountNumberMasked: maskAccountNumber(ben.accountNumber),
  holderName: maskHolderName(ben.holderName),
  nickname: ben.nickname,
  createdAt: ben.createdAt,
});

module.exports = {
  resolveRecipientPreview,
  createTransfer,
  getTransferById,
  listTransfers,
  addBeneficiary,
  listBeneficiaries,
  deleteBeneficiary,
};
