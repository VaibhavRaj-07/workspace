import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', notificationController.list);
router.patch('/:id/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);

export default router;
