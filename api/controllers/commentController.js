const Comment = require('../models/Comment');
const NotificationService = require('../services/NotificationService');
const { buildPagination, parsePagination } = require('../utils/pagination');
const { validateText } = require('../utils/validators');

const COMMENT_STATUSES = ['active', 'inactive'];
const DEFAULT_PAGE_SIZE = 20;
const COMMENT_SORTS = ['date', 'likes', 'post', 'author'];
const SORT_ORDERS = ['asc', 'desc'];

function canManage(comment, user) {
    return comment.author_id === user.id || user.role === 'admin';
}

class CommentController {
    static async getAll(req, res) {
        try {
            const pagination = parsePagination(req.query, DEFAULT_PAGE_SIZE);
            if (pagination.error) {
                return res.status(400).json({ message: pagination.error });
            }

            const { status } = req.query;
            if (status !== undefined && !COMMENT_STATUSES.includes(status)) {
                return res
                    .status(400)
                    .json({ message: `Status must be one of: ${COMMENT_STATUSES.join(', ')}` });
            }
            const sort = req.query.sort ?? 'date';
            const order = req.query.order ?? 'desc';
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            if (!COMMENT_SORTS.includes(sort)) {
                return res
                    .status(400)
                    .json({ message: `Sort must be one of: ${COMMENT_SORTS.join(', ')}` });
            }
            if (!SORT_ORDERS.includes(order)) {
                return res
                    .status(400)
                    .json({ message: `Order must be one of: ${SORT_ORDERS.join(', ')}` });
            }
            if (search.length > 255) {
                return res
                    .status(400)
                    .json({ message: 'Search must be at most 255 characters long' });
            }

            const { page, limit, offset } = pagination;
            const { comments, total } = await Comment.findAll({
                status,
                search,
                sort,
                order,
                limit,
                offset,
            });

            return res.status(200).json({
                data: comments,
                pagination: buildPagination('total_comments', total, page, limit),
            });
        } catch (error) {
            console.error('Error fetching comments:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getByPost(req, res) {
        try {
            const comments = await Comment.findByPost(req.post.id);
            return res.status(200).json(comments);
        } catch (error) {
            console.error(`Error fetching comments of post ID ${req.post.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async createForPost(req, res) {
        try {
            if (req.post.status !== 'active') {
                return res
                    .status(403)
                    .json({ message: 'Comments can only be added to active posts' });
            }

            const { content } = req.body;
            const contentError = validateText(content, 'Content');
            if (contentError) {
                return res.status(400).json({ message: contentError });
            }

            const commentId = await Comment.create({
                post_id: req.post.id,
                author_id: req.user.id,
                content: content.trim(),
            });
            const comment = await Comment.findById(commentId);
            await NotificationService.notifyPostCommented(req.post, comment, req.user);

            return res.status(201).json({ message: 'Comment created successfully', comment });
        } catch (error) {
            console.error(`Error creating a comment under post ID ${req.post.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getById(req, res) {
        try {
            const comment = await Comment.findById(req.comment.id);
            return res.status(200).json(comment);
        } catch (error) {
            console.error(`Error fetching comment ID ${req.comment.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async update(req, res) {
        try {
            if (
                !req.body ||
                typeof req.body !== 'object' ||
                Array.isArray(req.body) ||
                Object.keys(req.body).some((field) => field !== 'status')
            ) {
                return res.status(400).json({
                    message: 'Only the comment status can be changed',
                });
            }

            const { status } = req.body;
            if (!COMMENT_STATUSES.includes(status)) {
                return res
                    .status(400)
                    .json({ message: `Status must be one of: ${COMMENT_STATUSES.join(', ')}` });
            }

            await Comment.updateStatus(req.comment.id, status);
            const comment = await Comment.findById(req.comment.id);

            return res.status(200).json({ message: 'Comment updated successfully', comment });
        } catch (error) {
            console.error(`Error updating comment ID ${req.comment.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async delete(req, res) {
        try {
            if (!canManage(req.comment, req.user)) {
                return res
                    .status(403)
                    .json({ message: 'Only the author or an admin can delete this comment' });
            }

            await Comment.delete(req.comment.id, req.comment.author_id);
            return res.status(200).json({ message: 'Comment deleted successfully' });
        } catch (error) {
            console.error(`Error deleting comment ID ${req.comment.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = CommentController;
