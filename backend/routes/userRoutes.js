const express = require('express');
const UserController = require('../controllers/userController');
const { requireAuth, optionalAuth } = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const requireOwnerOrAdmin = require('../middlewares/requireOwnerOrAdmin');
const uploadAvatar = require('../middlewares/uploadAvatar');

const router = express.Router();

router.get('/', optionalAuth, UserController.getAll);
router.post('/', requireAuth, requireAdmin, UserController.create);
router.patch('/avatar', requireAuth, uploadAvatar, UserController.uploadAvatar);

router.get('/:user_id', optionalAuth, UserController.getById);
router.patch('/:user_id', requireAuth, requireOwnerOrAdmin, UserController.update);
router.delete('/:user_id', requireAuth, requireOwnerOrAdmin, UserController.delete);

module.exports = router;
