const Post = require('../models/Post');
const { parsePositiveInt } = require('../utils/validators');
const { isVisibleTo } = require('../utils/visibility');

async function loadPost(req, res, next) {
    const postId = parsePositiveInt(req.params.post_id);
    if (!postId) {
        return res.status(400).json({ message: 'Invalid post ID format' });
    }

    try {
        const post = await Post.findById(postId);
        if (!post || !isVisibleTo(post, req.user)) {
            return res.status(404).json({ message: 'Post not found' });
        }

        req.post = post;
        return next();
    } catch (error) {
        console.error(`Error loading post ID ${req.params.post_id}:`, error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = loadPost;
