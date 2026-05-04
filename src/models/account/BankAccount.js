const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const crypto = require('crypto');

const BankAccount = sequelize.define('BankAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  accountNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'account_number',
  },
  accountType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'SAVINGS',
    validate: { isIn: [['SAVINGS', 'CURRENT']] },
    field: 'account_type',
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'PKR',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'ACTIVE',
    validate: { isIn: [['ACTIVE', 'INACTIVE', 'FROZEN', 'CLOSED']] },
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at',
  },
}, {
  tableName: 'bank_accounts',
  paranoid: true,
  indexes: [
    { fields: ['user_id'] },
    { unique: true, fields: ['account_number'] },
    { fields: ['status'] },
  ],
});

/**
 * Generate a unique 16-digit account number prefixed with "NXB"
 */
BankAccount.generateAccountNumber = async () => {
  let accountNumber;
  let exists = true;
  while (exists) {
    const random = crypto.randomInt(1_000_000_000_000, 9_999_999_999_999);
    accountNumber = `NXB${random}`;
    exists = await BankAccount.findOne({ where: { accountNumber } });
  }
  return accountNumber;
};

module.exports = BankAccount;
