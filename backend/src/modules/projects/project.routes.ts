import { Router } from 'express';
import { projectController } from './project.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateProjectMemberSchema,
  projectQuerySchema,
} from './project.schema.js';
import { ProjectRole } from '@prisma/client';

const router = Router();

// All project routes require authentication
router.use(authenticateJWT);

router.post('/', validate(createProjectSchema), projectController.create);
router.get('/', validate(projectQuerySchema), projectController.list);

router.get('/:id', requireProjectRole(ProjectRole.viewer), projectController.getById);
router.patch(
  '/:id',
  requireProjectRole(ProjectRole.admin),
  validate(updateProjectSchema),
  projectController.update
);
router.delete('/:id', requireProjectRole(ProjectRole.owner), projectController.delete);

// Member management
router.post(
  '/:id/members',
  requireProjectRole(ProjectRole.admin),
  validate(addProjectMemberSchema),
  projectController.addMember
);
router.patch(
  '/:id/members/:userId',
  requireProjectRole(ProjectRole.admin),
  validate(updateProjectMemberSchema),
  projectController.updateMemberRole
);
router.delete(
  '/:id/members/:userId',
  requireProjectRole(ProjectRole.admin),
  projectController.removeMember
);

export default router;
