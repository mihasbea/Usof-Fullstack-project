const Comment = require('../models/Comment');
const { parsePositiveInt } = require('../utils/validators');
const { isVisibleTo } = require('../utils/visibility');

async function loadComment(req, res, next) {
    const commentId = parsePositiveInt(req.params.comment_id);
    if (!commentId) {
        return res.status(400).json({ message: 'Invalid comment ID format' });
    }

    try {
        const comment = await Comment.findAccessInfo(commentId);
        const post = comment && { status: comment.post_status, author_id: comment.post_author_id };

        if (!comment || !isVisibleTo(post, req.user)) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        req.comment = comment;
        return next();
    } catch (error) {
        console.error(`Error loading comment ID ${req.params.comment_id}:`, error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = loadComment;
