const UserProfile = require('./UserProfile');
const { User } = require('../auth');

// ─── ASSOCIATIONS ──────────────────────────────────────────
User.hasOne(UserProfile, { foreignKey: 'userId', as: 'profile', onDelete: 'CASCADE' });
UserProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { UserProfile };
