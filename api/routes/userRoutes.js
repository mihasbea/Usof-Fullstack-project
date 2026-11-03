const express = require('express');
const UserController = require('../controllers/userController');
const SubscriptionController = require('../controllers/subscriptionController');
const { requireAuth, optionalAuth } = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const requireOwnerOrAdmin = require('../middlewares/requireOwnerOrAdmin');
const parseIdParam = require('../middlewares/parseIdParam');
const uploadAvatar = require('../middlewares/uploadAvatar');

const router = express.Router();

router.get('/', optionalAuth, UserController.getAll);
router.get('/directory', optionalAuth, UserController.getDirectory);
router.post('/', requireAuth, requireAdmin, UserController.create);
router.patch('/avatar', requireAuth, uploadAvatar, UserController.uploadAvatar);
router.patch(
    '/:user_id/avatar',
    requireAuth,
    parseIdParam('user_id', 'user'),
    requireOwnerOrAdmin,
    uploadAvatar,
    UserController.uploadAvatar
);

router.get('/:user_id/followers', optionalAuth, UserController.getFollowers);
router.get('/:user_id/posts', optionalAuth, UserController.getPosts);
router.get('/:user_id/comments', optionalAuth, UserController.getComments);
router.get('/:user_id/categories', optionalAuth, UserController.getCategories);
router.post('/:user_id/subscription', requireAuth, SubscriptionController.subscribeToUser);
router.delete('/:user_id/subscription', requireAuth, SubscriptionController.unsubscribeFromUser);
router.get('/:user_id', optionalAuth, UserController.getById);
router.patch('/:user_id', requireAuth, requireOwnerOrAdmin, UserController.update);
router.delete('/:user_id', requireAuth, requireOwnerOrAdmin, UserController.delete);

module.exports = router;
