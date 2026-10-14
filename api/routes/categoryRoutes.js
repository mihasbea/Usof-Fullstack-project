const express = require('express');
const CategoryController = require('../controllers/categoryController');
const SubscriptionController = require('../controllers/subscriptionController');
const { requireAuth, optionalAuth } = require('../middlewares/authMiddleware');
const loadCategory = require('../middlewares/loadCategory');
const requireAdmin = require('../middlewares/requireAdmin');

const router = express.Router();

router.get('/', CategoryController.getAll);
router.post('/', requireAuth, requireAdmin, CategoryController.create);

router.get('/:category_id', loadCategory, CategoryController.getById);
router.patch('/:category_id', requireAuth, requireAdmin, loadCategory, CategoryController.update);
router.delete('/:category_id', requireAuth, requireAdmin, loadCategory, CategoryController.delete);

router.get('/:category_id/posts', optionalAuth, loadCategory, CategoryController.getPosts);

router.post(
    '/:category_id/subscription',
    requireAuth,
    loadCategory,
    SubscriptionController.subscribeToCategory
);
router.delete(
    '/:category_id/subscription',
    requireAuth,
    loadCategory,
    SubscriptionController.unsubscribeFromCategory
);

module.exports = router;
