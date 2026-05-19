const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id',
  },

  // ─── Mirrored from `users` (source of truth = users table) ──
  fullName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'full_name',
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    field: 'phone',
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'email',
    validate: { isEmail: true },
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
  kycStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'NOT_STARTED',
    field: 'kyc_status',
    validate: { isIn: [['NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED']] },
  },

  // ─── Banking profile additions ─────────────────────────────
  fatherName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'father_name',
  },
  cnic: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    validate: { is: /^[0-9-]{13,20}$/ },
  },
  maritalStatus: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'marital_status',
    validate: { isIn: [['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']] },
  },
  nationality: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Pakistani',
  },
  occupation: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  monthlyIncome: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'monthly_income',
  },
  addressLine: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'address_line',
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Pakistan',
  },
  emergencyContactName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'emergency_contact_name',
  },
  emergencyContactPhone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    field: 'emergency_contact_phone',
    validate: { is: /^\+?[1-9]\d{7,14}$/ },
  },
  profilePictureUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'profile_picture_url',
  },

  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at',
  },
}, {
  tableName: 'user_profiles',
  paranoid: true,
  indexes: [
    { fields: ['user_id'], unique: true },
    { fields: ['cnic'], unique: true, where: { cnic: { [Op.ne]: null } } },
  ],
});

module.exports = UserProfile;
