const BankAccount = require('./BankAccount');
const User = require('../auth/User');

// ─── ASSOCIATIONS ──────────────────────────────────────────
User.hasMany(BankAccount, { foreignKey: 'userId', as: 'bankAccounts' });
BankAccount.belongsTo(User, { foreignKey: 'userId' });

module.exports = { BankAccount };
