const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;
const MAX_ATTEMPTS_TEMP_LOCK = 3;
const MAX_ATTEMPTS_PERM_LOCK = 10;
const TEMP_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const MpinStore = sequelize.define('MpinStore', {
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
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  mpinHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'mpin_hash',
  },
  failedAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_attempts',
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_locked',
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'locked_until',
  },
  lastChangedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_changed_at',
  },
}, {
  tableName: 'mpin_store',
});

MpinStore.hashMpin = async (plainMpin) => {
  return bcrypt.hash(plainMpin, SALT_ROUNDS);
};

MpinStore.prototype.verifyMpin = async function (plainMpin) {
  // Check permanent lock
  if (this.isLocked && this.failedAttempts >= MAX_ATTEMPTS_PERM_LOCK) {
    return { valid: false, locked: true, permanent: true };
  }

  // Check temp lock expiry
  if (this.isLocked && this.lockedUntil) {
    if (new Date() < new Date(this.lockedUntil)) {
      return { valid: false, locked: true, lockedUntil: this.lockedUntil };
    }
    // Temp lock expired — unlock
    this.isLocked = false;
    this.lockedUntil = null;
    this.failedAttempts = 0;
  }

  const isMatch = await bcrypt.compare(plainMpin, this.mpinHash);

  if (!isMatch) {
    this.failedAttempts += 1;

    if (this.failedAttempts >= MAX_ATTEMPTS_PERM_LOCK) {
      this.isLocked = true;
      this.lockedUntil = null;
    } else if (this.failedAttempts >= MAX_ATTEMPTS_TEMP_LOCK) {
      this.isLocked = true;
      this.lockedUntil = new Date(Date.now() + TEMP_LOCK_DURATION_MS);
    }

    await this.save();
    return { valid: false, locked: this.isLocked, attemptsLeft: MAX_ATTEMPTS_TEMP_LOCK - this.failedAttempts };
  }

  // Success — reset attempts
  if (this.failedAttempts > 0) {
    this.failedAttempts = 0;
    this.isLocked = false;
    this.lockedUntil = null;
    await this.save();
  }

  return { valid: true };
};

module.exports = MpinStore;
