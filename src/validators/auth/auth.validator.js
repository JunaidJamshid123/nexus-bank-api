const { body, param } = require('express-validator');

const register = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^\+?[1-9]\d{7,14}$/).withMessage('Invalid phone format'),
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 255 }).withMessage('Full name too long'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email')
    .normalizeEmail()
    .custom((value) => {
      if (!value.endsWith('@nexusbank.com')) {
        throw new Error('Only @nexusbank.com email addresses are allowed');
      }
      return true;
    }),
  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)')
    .toDate(),
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Gender must be MALE, FEMALE, or OTHER'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
  body('mpin')
    .trim()
    .notEmpty().withMessage('MPIN is required')
    .isLength({ min: 4, max: 6 }).withMessage('MPIN must be 4-6 digits')
    .isNumeric().withMessage('MPIN must be numeric'),
];

const login = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^\+?[1-9]\d{7,14}$/).withMessage('Invalid phone format'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('mpin')
    .trim()
    .notEmpty().withMessage('MPIN is required')
    .isLength({ min: 4, max: 6 }).withMessage('MPIN must be 4-6 digits')
    .isNumeric().withMessage('MPIN must be numeric'),
  body('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
  body('deviceName')
    .optional()
    .trim(),
  body('osVersion')
    .optional()
    .trim(),
  body('appVersion')
    .optional()
    .trim(),
];

const checkPhone = [
  param('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^\+?[1-9]\d{7,14}$/).withMessage('Invalid phone format'),
];

const refreshToken = [
  body('refreshToken')
    .trim()
    .notEmpty().withMessage('Refresh token is required'),
];

const changeMpin = [
  body('oldMpin')
    .trim()
    .notEmpty().withMessage('Old MPIN is required')
    .isLength({ min: 4, max: 6 }).withMessage('MPIN must be 4-6 digits')
    .isNumeric().withMessage('MPIN must be numeric'),
  body('newMpin')
    .trim()
    .notEmpty().withMessage('New MPIN is required')
    .isLength({ min: 4, max: 6 }).withMessage('MPIN must be 4-6 digits')
    .isNumeric().withMessage('MPIN must be numeric'),
];

const changePassword = [
  body('oldPassword')
    .notEmpty().withMessage('Old password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
];

const resetMpin = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^\+?[1-9]\d{7,14}$/).withMessage('Invalid phone format'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)')
    .toDate(),
  body('newMpin')
    .trim()
    .notEmpty().withMessage('New MPIN is required')
    .isLength({ min: 4, max: 6 }).withMessage('MPIN must be 4-6 digits')
    .isNumeric().withMessage('MPIN must be numeric'),
];

const deleteSession = [
  param('sessionId')
    .isUUID().withMessage('Invalid session ID'),
];

module.exports = {
  register,
  login,
  checkPhone,
  refreshToken,
  changeMpin,
  changePassword,
  resetMpin,
  deleteSession,
};
