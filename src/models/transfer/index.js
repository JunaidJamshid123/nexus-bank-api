const Transaction = require('./Transaction');
const Beneficiary = require('./Beneficiary');
const BankAccount = require('../account/BankAccount');
const User = require('../auth/User');

// ─── ASSOCIATIONS ──────────────────────────────────────────
// Transactions
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

BankAccount.hasMany(Transaction, { foreignKey: 'accountId', as: 'transactions' });
Transaction.belongsTo(BankAccount, { foreignKey: 'accountId', as: 'account' });

Transaction.belongsTo(BankAccount, { foreignKey: 'counterpartyAccountId', as: 'counterpartyAccount' });
Transaction.belongsTo(User, { foreignKey: 'counterpartyUserId', as: 'counterpartyUser' });

// Beneficiaries
User.hasMany(Beneficiary, { foreignKey: 'userId', as: 'beneficiaries' });
Beneficiary.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
Beneficiary.belongsTo(User, { foreignKey: 'beneficiaryUserId', as: 'beneficiaryUser' });
Beneficiary.belongsTo(BankAccount, { foreignKey: 'beneficiaryAccountId', as: 'beneficiaryAccount' });

module.exports = { Transaction, Beneficiary };
