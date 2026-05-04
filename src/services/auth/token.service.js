const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { RefreshToken } = require('../../models/auth');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

const generateAccessToken = (userId, sessionId, deviceId) => {
  return jwt.sign(
    { userId, sessionId, deviceId },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

const createRefreshToken = async (userId, deviceId, sessionId) => {
  const rawToken = generateRefreshToken();
  const tokenHash = RefreshToken.hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId,
    tokenHash,
    deviceId,
    sessionId,
    expiresAt,
  });

  return rawToken;
};

const rotateRefreshToken = async (oldTokenDoc, userId, deviceId, sessionId) => {
  const rawToken = generateRefreshToken();
  const tokenHash = RefreshToken.hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const newTokenDoc = await RefreshToken.create({
    userId,
    tokenHash,
    deviceId,
    sessionId,
    expiresAt,
  });

  // Revoke old token and link to new one
  await oldTokenDoc.update({
    revokedAt: new Date(),
    replacedBy: newTokenDoc.id,
    revokeReason: 'ROTATED',
  });

  return rawToken;
};

const revokeTokensBySession = async (sessionId, reason = 'LOGOUT') => {
  await RefreshToken.update(
    { revokedAt: new Date(), revokeReason: reason },
    { where: { sessionId, revokedAt: null } }
  );
};

const revokeAllUserTokens = async (userId, reason = 'LOGOUT_ALL') => {
  await RefreshToken.update(
    { revokedAt: new Date(), revokeReason: reason },
    { where: { userId, revokedAt: null } }
  );
};

module.exports = {
  generateAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeTokensBySession,
  revokeAllUserTokens,
};
