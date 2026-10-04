import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schema.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.get('/me', authenticateJWT, authController.getMe);

export default router;
