const catchAsync = require('../../utils/catchAsync');
const profileService = require('../../services/profile/profile.service');

// GET /api/profile
const getMyProfile = catchAsync(async (req, res) => {
  const profile = await profileService.getMyProfile(req.user.id);
  res.json({ success: true, data: profile });
});

// PATCH /api/profile
const updateMyProfile = catchAsync(async (req, res) => {
  const profile = await profileService.updateMyProfile(req.user.id, req.body);
  res.json({ success: true, message: 'Profile updated', data: profile });
});

// PATCH /api/profile/picture
const updateProfilePicture = catchAsync(async (req, res) => {
  const profile = await profileService.updateProfilePicture(req.user.id, req.body.profilePictureUrl);
  res.json({ success: true, message: 'Profile picture updated', data: profile });
});

// DELETE /api/profile/picture
const removeProfilePicture = catchAsync(async (req, res) => {
  await profileService.removeProfilePicture(req.user.id);
  res.json({ success: true, message: 'Profile picture removed' });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateProfilePicture,
  removeProfilePicture,
};
