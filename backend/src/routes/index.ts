import { Router } from 'express';

import authRoutes from './auth.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/api', healthRoutes);
router.use('/api/auth', authRoutes);

export default router;