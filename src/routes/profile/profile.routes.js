const express = require('express');
const router = express.Router();
const profileController = require('../../controllers/profile/profile.controller');
const profileValidator = require('../../validators/profile/profile.validator');
const validate = require('../../middlewares/validate.middleware');
const auth = require('../../middlewares/auth/auth.middleware');
const { apiLimiter } = require('../../middlewares/rateLimiter.middleware');

// All profile routes require authentication (logged-in user only)
router.use(auth);

router.get('/', apiLimiter, profileController.getMyProfile);
router.patch('/', apiLimiter, profileValidator.updateProfile, validate, profileController.updateMyProfile);
router.put('/', apiLimiter, profileValidator.updateProfile, validate, profileController.updateMyProfile);

router.patch('/picture', apiLimiter, profileValidator.updateProfilePicture, validate, profileController.updateProfilePicture);
router.delete('/picture', apiLimiter, profileController.removeProfilePicture);

module.exports = router;
