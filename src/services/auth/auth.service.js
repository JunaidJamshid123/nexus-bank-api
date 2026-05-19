const { Op } = require('sequelize');
const { User, MpinStore, Session, RefreshToken } = require('../../models/auth');
const { BankAccount } = require('../../models/account');
const accountService = require('../account/account.service');
const profileService = require('../profile/profile.service');
const ApiError = require('../../utils/ApiError');
const tokenService = require('./token.service');

// ─── REGISTER ──────────────────────────────────────────────
const register = async ({ phone, fullName, email, dateOfBirth, gender, password, mpin }) => {
  const existing = await User.findOne({ where: { phone } });
  if (existing) {
    throw new ApiError(409, 'Phone number already registered');
  }

  if (email) {
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      throw new ApiError(409, 'Email already registered');
    }
  }

  const user = await User.create({ phone, fullName, email, dateOfBirth, gender, passwordHash: password });

  const mpinHash = await MpinStore.hashMpin(mpin);
  await MpinStore.create({ userId: user.id, mpinHash });

  // Auto-create the user profile row (mirrors users fields + banking-only fields)
  await profileService.createProfileForUser(user);

  // Auto-create a default savings bank account
  const bankAccount = await accountService.createAccount({
    userId: user.id,
    accountType: 'SAVINGS',
    currency: 'PKR',
  });

  return {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    email: user.email,
    bankAccount,
  };
};

// ─── CHECK PHONE ───────────────────────────────────────────
const checkPhone = async (phone) => {
  const user = await User.findOne({ where: { phone }, attributes: ['phone'] });
  return { exists: !!user };
};

// ─── LOGIN ─────────────────────────────────────────────────
const login = async ({ phone, password, mpin, deviceId, deviceName, osVersion, appVersion, ipAddress }) => {
  const user = await User.findOne({ where: { phone } });
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated');
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'Account is blocked');
  }

  // Verify password first
  const passwordValid = await user.verifyPassword(password);
  if (!passwordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const mpinDoc = await MpinStore.findOne({ where: { userId: user.id } });
  if (!mpinDoc) {
    throw new ApiError(500, 'MPIN not configured');
  }

  const result = await mpinDoc.verifyMpin(mpin);

  if (!result.valid) {
    if (result.permanent) {
      throw new ApiError(423, 'Account permanently locked. Contact support');
    }
    if (result.locked) {
      throw new ApiError(423, `Account locked until ${new Date(result.lockedUntil).toISOString()}`);
    }
    throw new ApiError(401, 'Invalid credentials');
  }

  // Create session
  const session = await Session.create({
    userId: user.id,
    deviceId,
    deviceName,
    osVersion,
    appVersion,
    ipAddress,
  });

  const accessToken = tokenService.generateAccessToken(user.id, session.id, deviceId);
  const refreshToken = await tokenService.createRefreshToken(user.id, deviceId, session.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      email: user.email,
      kycStatus: user.kycStatus,
    },
  };
};

// ─── REFRESH TOKEN ─────────────────────────────────────────
const refreshAccessToken = async (rawRefreshToken) => {
  const tokenHash = RefreshToken.hashToken(rawRefreshToken);
  const tokenDoc = await RefreshToken.findOne({ where: { tokenHash } });

  if (!tokenDoc) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  // Detect reuse of a revoked token (potential theft)
  if (tokenDoc.revokedAt) {
    await tokenService.revokeTokensBySession(tokenDoc.sessionId, 'SUSPECTED_THEFT');
    await Session.update(
      { isActive: false, logoutAt: new Date(), logoutReason: 'FORCE_LOGOUT' },
      { where: { id: tokenDoc.sessionId } }
    );
    throw new ApiError(401, 'Refresh token was reused. Session terminated for security');
  }

  if (new Date(tokenDoc.expiresAt) < new Date()) {
    throw new ApiError(401, 'Refresh token expired');
  }

  const session = await Session.findByPk(tokenDoc.sessionId);
  if (!session || !session.isActive) {
    throw new ApiError(401, 'Session is no longer active');
  }

  const user = await User.findByPk(tokenDoc.userId);
  if (!user || !user.isActive || user.isBlocked) {
    throw new ApiError(403, 'Account is not accessible');
  }

  // Rotate token
  const newRawToken = await tokenService.rotateRefreshToken(
    tokenDoc, tokenDoc.userId, tokenDoc.deviceId, tokenDoc.sessionId
  );
  const accessToken = tokenService.generateAccessToken(
    tokenDoc.userId, tokenDoc.sessionId, tokenDoc.deviceId
  );

  return { accessToken, refreshToken: newRawToken };
};

// ─── LOGOUT ────────────────────────────────────────────────
const logout = async (sessionId) => {
  const session = await Session.findByPk(sessionId);
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  await session.update({
    isActive: false,
    logoutAt: new Date(),
    logoutReason: 'USER',
  });

  await tokenService.revokeTokensBySession(sessionId, 'LOGOUT');
};

// ─── GET SESSIONS ──────────────────────────────────────────
const getSessions = async (userId) => {
  const sessions = await Session.findAll({
    where: { userId, isActive: true },
    attributes: ['id', 'deviceId', 'deviceName', 'osVersion', 'appVersion', 'ipAddress', 'geoLocation', 'loginAt', 'lastActiveAt'],
    order: [['lastActiveAt', 'DESC']],
  });
  return sessions;
};

// ─── FORCE LOGOUT SESSION ──────────────────────────────────
const forceLogoutSession = async (userId, sessionId) => {
  const session = await Session.findOne({ where: { id: sessionId, userId } });
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  if (!session.isActive) {
    throw new ApiError(400, 'Session is already logged out');
  }

  await session.update({
    isActive: false,
    logoutAt: new Date(),
    logoutReason: 'FORCE_LOGOUT',
  });

  await tokenService.revokeTokensBySession(sessionId, 'FORCE_LOGOUT');
};

// ─── CHANGE MPIN ───────────────────────────────────────────
const changeMpin = async (userId, oldMpin, newMpin) => {
  const mpinDoc = await MpinStore.findOne({ where: { userId } });
  if (!mpinDoc) {
    throw new ApiError(500, 'MPIN not configured');
  }

  const result = await mpinDoc.verifyMpin(oldMpin);
  if (!result.valid) {
    if (result.locked) {
      throw new ApiError(423, 'Account is locked due to too many failed attempts');
    }
    throw new ApiError(401, 'Old MPIN is incorrect');
  }

  const mpinHash = await MpinStore.hashMpin(newMpin);
  await mpinDoc.update({
    mpinHash,
    failedAttempts: 0,
    isLocked: false,
    lockedUntil: null,
    lastChangedAt: new Date(),
  });
};

// ─── RESET MPIN ────────────────────────────────────────────
const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const passwordValid = await user.verifyPassword(oldPassword);
  if (!passwordValid) {
    throw new ApiError(401, 'Old password is incorrect');
  }

  await user.update({ passwordHash: newPassword });
};

// ─── RESET MPIN ────────────────────────────────────────────
const resetMpin = async (phone, password, dateOfBirth, newMpin) => {
  const user = await User.findOne({ where: { phone } });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Verify password
  const passwordValid = await user.verifyPassword(password);
  if (!passwordValid) {
    throw new ApiError(401, 'Invalid password');
  }

  // Verify identity via date of birth
  const userDob = user.dateOfBirth ? user.dateOfBirth : null;
  const inputDob = new Date(dateOfBirth).toISOString().split('T')[0];

  if (!userDob || userDob !== inputDob) {
    throw new ApiError(401, 'Identity verification failed');
  }

  const mpinDoc = await MpinStore.findOne({ where: { userId: user.id } });
  if (!mpinDoc) {
    throw new ApiError(500, 'MPIN not configured');
  }

  const mpinHash = await MpinStore.hashMpin(newMpin);
  await mpinDoc.update({
    mpinHash,
    failedAttempts: 0,
    isLocked: false,
    lockedUntil: null,
    lastChangedAt: new Date(),
  });

  // Revoke all sessions + tokens for security
  await Session.update(
    { isActive: false, logoutAt: new Date(), logoutReason: 'FORCE_LOGOUT' },
    { where: { userId: user.id, isActive: true } }
  );
  await tokenService.revokeAllUserTokens(user.id, 'MPIN_RESET');
};

// ─── GET CURRENT USER ──────────────────────────────────────
const getMe = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['deletedAt', 'passwordHash'] },
    include: [{
      model: BankAccount,
      as: 'bankAccounts',
      attributes: ['id', 'accountNumber', 'accountType', 'balance', 'currency', 'status', 'createdAt'],
    }],
  });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

// ─── GET ALL USERS ─────────────────────────────────────────
const getAllUsers = async () => {
  const users = await User.findAll({
    attributes: { exclude: ['passwordHash', 'deletedAt'] },
    order: [['createdAt', 'DESC']],
  });
  return users;
};

module.exports = {
  register,
  checkPhone,
  login,
  refreshAccessToken,
  logout,
  getSessions,
  forceLogoutSession,
  changeMpin,
  changePassword,
  resetMpin,
  getMe,
  getAllUsers,
};
