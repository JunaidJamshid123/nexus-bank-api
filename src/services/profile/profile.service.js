const { sequelize } = require('../../config/db');
const { User } = require('../../models/auth');
const { UserProfile } = require('../../models/profile');
const ApiError = require('../../utils/ApiError');

// Fields mirrored between `users` and `user_profiles`.
// Updating these via /api/profile updates BOTH tables in a transaction.
const MIRRORED_FIELDS = ['fullName', 'email', 'dateOfBirth', 'gender'];

// Banking-only fields stored on `user_profiles`.
const PROFILE_ONLY_FIELDS = [
  'fatherName', 'cnic', 'maritalStatus', 'nationality',
  'occupation', 'monthlyIncome',
  'addressLine', 'city', 'country',
  'emergencyContactName', 'emergencyContactPhone',
  'profilePictureUrl',
];

const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
};

// ─── Create profile row alongside a new user (called from auth.register) ──
const createProfileForUser = async (user, transaction) => {
  return UserProfile.create({
    userId: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    kycStatus: user.kycStatus,
  }, { transaction });
};

// ─── GET my profile ────────────────────────────────────────
const getMyProfile = async (userId) => {
  let profile = await UserProfile.findOne({ where: { userId } });

  // Self-heal for legacy users created before this module existed
  if (!profile) {
    const user = await User.findByPk(userId);
    if (!user) throw new ApiError(404, 'User not found');
    profile = await createProfileForUser(user);
  }

  return profile;
};

// ─── UPDATE my profile (mirrored fields propagate to users) ─
const updateMyProfile = async (userId, payload) => {
  const profileUpdates = pick(payload, PROFILE_ONLY_FIELDS);
  const mirroredUpdates = pick(payload, MIRRORED_FIELDS);

  if (Object.keys(profileUpdates).length === 0 && Object.keys(mirroredUpdates).length === 0) {
    throw new ApiError(400, 'No valid profile fields provided');
  }

  // CNIC uniqueness pre-check (better error than generic SequelizeUniqueConstraintError)
  if (profileUpdates.cnic) {
    const clash = await UserProfile.findOne({ where: { cnic: profileUpdates.cnic } });
    if (clash && clash.userId !== userId) {
      throw new ApiError(409, 'CNIC is already registered to another user');
    }
  }

  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) throw new ApiError(404, 'User not found');

    let profile = await UserProfile.findOne({ where: { userId }, transaction: t });
    if (!profile) {
      profile = await createProfileForUser(user, t);
    }

    // Update users table for mirrored fields (single source of truth)
    if (Object.keys(mirroredUpdates).length > 0) {
      await user.update(mirroredUpdates, { transaction: t });
    }

    // Apply mirrored + profile-only fields to the profile row
    await profile.update({ ...mirroredUpdates, ...profileUpdates }, { transaction: t });

    return profile;
  });
};

// ─── PROFILE PICTURE ───────────────────────────────────────
const updateProfilePicture = async (userId, profilePictureUrl) => {
  const profile = await getMyProfile(userId);
  await profile.update({ profilePictureUrl });
  return profile;
};

const removeProfilePicture = async (userId) => {
  const profile = await UserProfile.findOne({ where: { userId } });
  if (!profile) throw new ApiError(404, 'Profile not found');
  await profile.update({ profilePictureUrl: null });
  return profile;
};

module.exports = {
  createProfileForUser,
  getMyProfile,
  updateMyProfile,
  updateProfilePicture,
  removeProfilePicture,
};
