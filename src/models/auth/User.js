const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
    validate: { is: /^\+?[1-9]\d{7,14}$/ },
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash',
  },
  fullName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'full_name',
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_of_birth',
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: { isIn: [['MALE', 'FEMALE', 'OTHER']] },
  },
  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'avatar_url',
  },
  kycStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'NOT_STARTED',
    validate: { isIn: [['NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED']] },
    field: 'kyc_status',
  },
  riskCategory: {
    type: DataTypes.STRING(20),
    defaultValue: 'LOW',
    validate: { isIn: [['LOW', 'MEDIUM', 'HIGH']] },
    field: 'risk_category',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_blocked',
  },
  blockedReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'blocked_reason',
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at',
  },
}, {
  tableName: 'users',
  paranoid: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash && !user.passwordHash.startsWith('$2')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, SALT_ROUNDS);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash') && !user.passwordHash.startsWith('$2')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, SALT_ROUNDS);
      }
    },
  },
  indexes: [
    { fields: ['phone'] },
    { fields: ['email'] },
    { fields: ['kyc_status'] },
    { fields: ['is_active'], where: { deleted_at: null } },
  ],
});

User.prototype.verifyPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = User;
