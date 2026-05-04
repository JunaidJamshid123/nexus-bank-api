const User = require('./User');
const MpinStore = require('./MpinStore');
const Session = require('./Session');
const RefreshToken = require('./RefreshToken');

// ─── ASSOCIATIONS ──────────────────────────────────────────
User.hasOne(MpinStore, { foreignKey: 'userId', as: 'mpin' });
MpinStore.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

Session.hasMany(RefreshToken, { foreignKey: 'sessionId', as: 'tokens' });
RefreshToken.belongsTo(Session, { foreignKey: 'sessionId' });

module.exports = { User, MpinStore, Session, RefreshToken };
