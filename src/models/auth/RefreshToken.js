const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const crypto = require('crypto');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  tokenHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'token_hash',
  },
  deviceId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'device_id',
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'session_id',
    references: { model: 'sessions', key: 'id' },
  },
  issuedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'issued_at',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'revoked_at',
  },
  replacedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'replaced_by',
  },
  revokeReason: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'revoke_reason',
  },
}, {
  tableName: 'refresh_tokens',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token_hash'] },
    { fields: ['user_id', 'device_id'] },
  ],
});

RefreshToken.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = RefreshToken;
