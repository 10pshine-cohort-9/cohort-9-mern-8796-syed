import { Router } from 'express';

import { authMiddleware } from '../middleware/authMiddleware';
import {
    getAuthenticatedUserController,
    loginUser,
    logoutUser,
    registerUser,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', authMiddleware, logoutUser);
router.get('/me', authMiddleware, getAuthenticatedUserController);

export default router;