const express = require('express');
const CommentController = require('../controllers/commentController');
const FavoriteController = require('../controllers/favoriteController');
const LikeController = require('../controllers/likeController');
const PostController = require('../controllers/PostController');
const SubscriptionController = require('../controllers/subscriptionController');
const { requireAuth, optionalAuth } = require('../middlewares/authMiddleware');
const loadPost = require('../middlewares/loadPost');
const parseIdParam = require('../middlewares/parseIdParam');
const uploadPostMedia = require('../middlewares/uploadPostMedia');

const router = express.Router();
const parsePostId = parseIdParam('post_id', 'post');

router.get('/', optionalAuth, PostController.getAll);
router.post('/', requireAuth, uploadPostMedia, PostController.create);

router.get('/:post_id', optionalAuth, loadPost, PostController.getById);
router.patch('/:post_id', requireAuth, loadPost, PostController.update);
router.delete('/:post_id', requireAuth, loadPost, PostController.delete);

router.get('/:post_id/categories', optionalAuth, loadPost, PostController.getCategories);

router.get('/:post_id/comments', optionalAuth, loadPost, CommentController.getByPost);
router.post('/:post_id/comments', requireAuth, loadPost, CommentController.createForPost);

router.get('/:post_id/like', optionalAuth, loadPost, LikeController.getByPost);
router.post('/:post_id/like', requireAuth, loadPost, LikeController.createForPost);
router.delete('/:post_id/like', requireAuth, loadPost, LikeController.deleteForPost);

router.post('/:post_id/favorite', requireAuth, loadPost, FavoriteController.add);
router.delete('/:post_id/favorite', requireAuth, parsePostId, FavoriteController.remove);

router.post(
    '/:post_id/subscription',
    requireAuth,
    loadPost,
    SubscriptionController.subscribeToPost
);
router.delete(
    '/:post_id/subscription',
    requireAuth,
    parsePostId,
    SubscriptionController.unsubscribeFromPost
);

module.exports = router;
