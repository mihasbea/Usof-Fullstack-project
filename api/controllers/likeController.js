const { isDuplicateEntryError } = require('../db/db');
const Like = require('../models/Like');

const LIKE_TYPES = ['like', 'dislike'];
const TARGET_LABELS = { post: 'Post', comment: 'Comment' };

function postTarget(req) {
    return {
        type: 'post',
        id: req.post.id,
        ownerId: req.post.author_id,
        isActive: req.post.status === 'active',
    };
}

function commentTarget(req) {
    return {
        type: 'comment',
        id: req.comment.id,
        ownerId: req.comment.author_id,
        isActive: req.comment.status === 'active' && req.comment.post_status === 'active',
    };
}

async function getLikes(req, res, target) {
    try {
        if (!target.isActive && req.user?.role !== 'admin') {
            return res
                .status(403)
                .json({ message: `Likes can only be viewed under active ${target.type}s` });
        }

        const likes = await Like.findByTarget(target.type, target.id);
        return res.status(200).json(likes);
    } catch (error) {
        console.error(`Error fetching likes of ${target.type} ID ${target.id}:`, error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function createLike(req, res, target) {
    try {
        const { type = 'like' } = req.body;
        if (!LIKE_TYPES.includes(type)) {
            return res
                .status(400)
                .json({ message: `Type must be one of: ${LIKE_TYPES.join(', ')}` });
        }

        if (!target.isActive) {
            return res.status(403).json({ message: `Only active ${target.type}s can be liked` });
        }

        const existingLike = await Like.findByAuthorAndTarget(req.user.id, target.type, target.id);
        if (existingLike?.type === type) {
            return res
                .status(409)
                .json({ message: `You have already ${type}d this ${target.type}` });
        }

        if (existingLike) {
            await Like.updateType(existingLike.id, type, target.ownerId);
            const like = await Like.findById(existingLike.id);
            return res.status(200).json({ message: `Changed to ${type}`, like });
        }

        const likeId = await Like.create({
            authorId: req.user.id,
            targetType: target.type,
            targetId: target.id,
            type,
            ownerId: target.ownerId,
        });
        const like = await Like.findById(likeId);

        return res
            .status(201)
            .json({ message: `${TARGET_LABELS[target.type]} ${type}d successfully`, like });
    } catch (error) {
        if (isDuplicateEntryError(error)) {
            return res.status(409).json({ message: `You have already rated this ${target.type}` });
        }
        console.error(`Error liking ${target.type} ID ${target.id}:`, error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteLike(req, res, target) {
    try {
        const like = await Like.findByAuthorAndTarget(req.user.id, target.type, target.id);
        if (!like) {
            return res.status(404).json({ message: `You have not rated this ${target.type}` });
        }

        await Like.delete(like.id, target.ownerId);
        return res.status(200).json({ message: 'Like deleted successfully' });
    } catch (error) {
        console.error(`Error deleting a like under ${target.type} ID ${target.id}:`, error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

class LikeController {
    static getByPost(req, res) {
        return getLikes(req, res, postTarget(req));
    }

    static createForPost(req, res) {
        return createLike(req, res, postTarget(req));
    }

    static deleteForPost(req, res) {
        return deleteLike(req, res, postTarget(req));
    }

    static getByComment(req, res) {
        return getLikes(req, res, commentTarget(req));
    }

    static createForComment(req, res) {
        return createLike(req, res, commentTarget(req));
    }

    static deleteForComment(req, res) {
        return deleteLike(req, res, commentTarget(req));
    }
}

module.exports = LikeController;
