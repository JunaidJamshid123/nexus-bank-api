const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Session = sequelize.define('Session', {
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
  deviceId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'device_id',
  },
  deviceName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'device_name',
  },
  osVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'os_version',
  },
  appVersion: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'app_version',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: false,
    field: 'ip_address',
  },
  geoLocation: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'geo_location',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  loginAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'login_at',
  },
  lastActiveAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_active_at',
  },
  logoutAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'logout_at',
  },
  logoutReason: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: { isIn: [['USER', 'TOKEN_EXPIRED', 'FORCE_LOGOUT', 'NEW_LOGIN']] },
    field: 'logout_reason',
  },
}, {
  tableName: 'sessions',
  indexes: [
    { fields: ['user_id', 'is_active'] },
    { fields: ['device_id'] },
  ],
});

module.exports = Session;
