const jwt = require('jsonwebtoken');
const ApiError = require('../../utils/ApiError');
const { User, Session } = require('../../models/auth');

const auth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token is required');
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(payload.userId);
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (!user.isActive || user.isBlocked) {
      throw new ApiError(403, 'Account is deactivated or blocked');
    }

    const session = await Session.findByPk(payload.sessionId);
    if (!session || !session.isActive) {
      throw new ApiError(401, 'Session expired or logged out');
    }

    // Update last active timestamp
    await session.update({ lastActiveAt: new Date() });

    req.user = user;
    req.sessionId = payload.sessionId;
    req.deviceId = payload.deviceId;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    if (error.name === 'TokenExpiredError') return next(new ApiError(401, 'Access token expired'));
    if (error.name === 'JsonWebTokenError') return next(new ApiError(401, 'Invalid access token'));
    next(new ApiError(401, 'Authentication failed'));
  }
};

module.exports = auth;
