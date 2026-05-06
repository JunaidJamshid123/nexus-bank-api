const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Beneficiary = sequelize.define('Beneficiary', {
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
  // The NexusBank user being saved as beneficiary
  beneficiaryUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'beneficiary_user_id',
  },
  beneficiaryAccountId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'beneficiary_account_id',
  },
  accountNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'account_number',
  },
  holderName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'holder_name',
  },
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'beneficiaries',
  indexes: [
    { fields: ['user_id'] },
    { unique: true, fields: ['user_id', 'beneficiary_account_id'] },
  ],
});

module.exports = Beneficiary;
