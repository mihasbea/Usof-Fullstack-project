const express = require('express');
const CommentController = require('../controllers/commentController');
const LikeController = require('../controllers/likeController');
const { requireAuth, optionalAuth } = require('../middlewares/authMiddleware');
const loadComment = require('../middlewares/loadComment');
const requireAdmin = require('../middlewares/requireAdmin');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, CommentController.getAll);

router.get('/:comment_id', optionalAuth, loadComment, CommentController.getById);
router.patch('/:comment_id', requireAuth, loadComment, CommentController.update);
router.delete('/:comment_id', requireAuth, loadComment, CommentController.delete);

router.get('/:comment_id/like', optionalAuth, loadComment, LikeController.getByComment);
router.post('/:comment_id/like', requireAuth, loadComment, LikeController.createForComment);
router.delete('/:comment_id/like', requireAuth, loadComment, LikeController.deleteForComment);

module.exports = router;
