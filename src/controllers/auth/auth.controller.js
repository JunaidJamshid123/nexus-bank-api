const catchAsync = require('../../utils/catchAsync');
const authService = require('../../services/auth/auth.service');

// POST /api/auth/register
const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({ success: true, message: 'Registration successful', data: user });
});

// GET /api/auth/check-phone/:phone
const checkPhone = catchAsync(async (req, res) => {
  const result = await authService.checkPhone(req.params.phone);
  res.json({ success: true, data: result });
});

// POST /api/auth/login
const login = catchAsync(async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const result = await authService.login({ ...req.body, ipAddress });
  res.json({ success: true, message: 'Login successful', data: result });
});

// POST /api/auth/token/refresh
const refreshToken = catchAsync(async (req, res) => {
  const result = await authService.refreshAccessToken(req.body.refreshToken);
  res.json({ success: true, data: result });
});

// POST /api/auth/logout
const logout = catchAsync(async (req, res) => {
  await authService.logout(req.sessionId);
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/sessions
const getSessions = catchAsync(async (req, res) => {
  const sessions = await authService.getSessions(req.user.id);
  res.json({ success: true, data: sessions });
});

// DELETE /api/auth/sessions/:sessionId
const deleteSession = catchAsync(async (req, res) => {
  await authService.forceLogoutSession(req.user.id, req.params.sessionId);
  res.json({ success: true, message: 'Session terminated' });
});

// PUT /api/auth/mpin/change
const changeMpin = catchAsync(async (req, res) => {
  await authService.changeMpin(req.user.id, req.body.oldMpin, req.body.newMpin);
  res.json({ success: true, message: 'MPIN changed successfully' });
});

// PUT /api/auth/password/change
const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
  res.json({ success: true, message: 'Password changed successfully' });
});

// POST /api/auth/mpin/reset
const resetMpin = catchAsync(async (req, res) => {
  await authService.resetMpin(req.body.phone, req.body.password, req.body.dateOfBirth, req.body.newMpin);
  res.json({ success: true, message: 'MPIN reset successful. All sessions have been logged out' });
});

// GET /api/auth/me
const getMe = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({ success: true, data: user });
});

// GET /api/auth/users
const getAllUsers = catchAsync(async (req, res) => {
  const users = await authService.getAllUsers();
  res.json({ success: true, data: users });
});

module.exports = {
  register,
  checkPhone,
  login,
  refreshToken,
  logout,
  getSessions,
  deleteSession,
  changeMpin,
  changePassword,
  resetMpin,
  getMe,
  getAllUsers,
};
