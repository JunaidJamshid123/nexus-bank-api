const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const crypto = require('crypto');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  referenceNumber: {
    type: DataTypes.STRING(32),
    allowNull: false,
    field: 'reference_number',
  },
  idempotencyKey: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'idempotency_key',
  },
  transferType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'INTERNAL',
    validate: { isIn: [['SELF', 'INTERNAL', 'EXTERNAL']] },
    field: 'transfer_type',
  },
  direction: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [['DEBIT', 'CREDIT']] },
  },
  // The account this row affects (the "owner" side of the leg)
  accountId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'account_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  // Counterparty (the "other" side of the leg)
  counterpartyAccountId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'counterparty_account_id',
  },
  counterpartyUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'counterparty_user_id',
  },
  counterpartyAccountNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'counterparty_account_number',
  },
  counterpartyName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'counterparty_name',
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  fee: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  netAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'net_amount',
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'PKR',
  },
  runningBalance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'running_balance',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PENDING',
    validate: { isIn: [['PENDING', 'SUCCESS', 'FAILED', 'REVERSED']] },
  },
  failureReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'failure_reason',
  },
  purpose: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  remarks: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
  },
  deviceId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'device_id',
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
  },
}, {
  tableName: 'transactions',
  indexes: [
    { fields: ['reference_number'] },
    { fields: ['account_id', 'created_at'] },
    { fields: ['user_id', 'created_at'] },
    { fields: ['status'] },
    { unique: true, fields: ['user_id', 'idempotency_key'] },
  ],
});

/**
 * Generate unique reference number, e.g. TXN20260506AB12CD34
 */
Transaction.generateReferenceNumber = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TXN${yyyy}${mm}${dd}${rand}`;
};

module.exports = Transaction;
