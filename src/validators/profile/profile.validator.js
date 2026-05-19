const { body } = require('express-validator');

const MARITAL = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];
const GENDER = ['MALE', 'FEMALE', 'OTHER'];
const phoneRegex = /^\+?[1-9]\d{7,14}$/;

// Accept either an http(s) URL OR a base64 data URI (image/png|jpeg|jpg|webp|gif)
const dataUriRegex = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i;
const httpUrlRegex = /^https?:\/\/[^\s]+$/i;
const MAX_PICTURE_BYTES = 5 * 1024 * 1024; // 5 MB raw string length

const isValidPicture = (value) => {
  if (typeof value !== 'string') {
    throw new Error('profilePictureUrl must be a string');
  }
  if (value.length > MAX_PICTURE_BYTES) {
    throw new Error('profilePictureUrl is too large (max 5MB)');
  }
  if (!httpUrlRegex.test(value) && !dataUriRegex.test(value)) {
    throw new Error('profilePictureUrl must be a valid URL or base64 data URI (image/png|jpeg|webp|gif)');
  }
  return true;
};

// All fields optional - PATCH-style update.
const updateProfile = [
  // Mirrored fields (also update `users`)
  body('fullName').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Invalid fullName'),
  body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid dateOfBirth (YYYY-MM-DD)'),
  body('gender').optional().isIn(GENDER).withMessage(`gender must be one of ${GENDER.join(', ')}`),

  // Banking profile fields
  body('fatherName').optional().trim().isLength({ max: 255 }),
  body('cnic').optional().trim().matches(/^[0-9-]{13,20}$/).withMessage('Invalid CNIC format'),
  body('maritalStatus').optional().isIn(MARITAL).withMessage(`maritalStatus must be one of ${MARITAL.join(', ')}`),
  body('nationality').optional().trim().isLength({ max: 100 }),
  body('occupation').optional().trim().isLength({ max: 100 }),
  body('monthlyIncome').optional().isFloat({ min: 0 }).withMessage('monthlyIncome must be >= 0'),
  body('addressLine').optional().trim().isLength({ max: 500 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('country').optional().trim().isLength({ max: 100 }),
  body('emergencyContactName').optional().trim().isLength({ max: 255 }),
  body('emergencyContactPhone').optional().trim().matches(phoneRegex).withMessage('Invalid emergencyContactPhone'),
  body('profilePictureUrl').optional().custom(isValidPicture),

  // Disallowed fields (changed via separate flows)
  body('phone').not().exists().withMessage('phone cannot be changed via profile'),
  body('kycStatus').not().exists().withMessage('kycStatus cannot be changed via profile'),
  body('userId').not().exists().withMessage('userId cannot be changed'),
];

const updateProfilePicture = [
  body('profilePictureUrl')
    .exists({ checkNull: true }).withMessage('profilePictureUrl is required')
    .bail()
    .custom(isValidPicture),
];

module.exports = { updateProfile, updateProfilePicture };
