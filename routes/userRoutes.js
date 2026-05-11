import express from 'express';
import { signupUser, loginUser, getUserProfile, resetPassword } from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/get-profile', protect, getUserProfile);
router.post('/reset-password', protect, resetPassword);

export default router;

