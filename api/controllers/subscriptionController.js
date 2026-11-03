const { isDuplicateEntryError } = require('../db/db');
const Post = require('../models/Post');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { buildPagination, parsePagination } = require('../utils/pagination');
const { buildPostListResponse, parsePostListQuery } = require('../utils/postListQuery');
const { parsePositiveInt } = require('../utils/validators');

class SubscriptionController {
    static async getUsers(req, res) {
        try {
            const pagination = parsePagination(req.query, 20);
            if (pagination.error) {
                return res.status(400).json({ message: pagination.error });
            }

            const { users, total } = await Subscription.findUsersBySubscriber(
                req.user.id,
                pagination
            );
            return res.status(200).json({
                data: users,
                pagination: buildPagination(
                    'total_users',
                    total,
                    pagination.page,
                    pagination.limit
                ),
            });
        } catch (error) {
            console.error('Error fetching followed users:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async subscribeToUser(req, res) {
        try {
            const followedId = parsePositiveInt(req.params.user_id);
            if (!followedId) {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }
            if (followedId === req.user.id) {
                return res.status(400).json({ message: 'You cannot follow yourself' });
            }
            if (!(await User.findPublicById(followedId))) {
                return res.status(404).json({ message: 'User not found' });
            }

            await Subscription.subscribeToUser(req.user.id, followedId);
            return res.status(201).json({ message: 'You are now following this user' });
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return res.status(409).json({ message: 'You are already following this user' });
            }
            console.error(`Error following user ID ${req.params.user_id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async unsubscribeFromUser(req, res) {
        try {
            const followedId = parsePositiveInt(req.params.user_id);
            if (!followedId) {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }

            const removed = await Subscription.unsubscribeFromUser(req.user.id, followedId);
            if (!removed) {
                return res.status(404).json({ message: 'You are not following this user' });
            }
            return res.status(200).json({ message: 'You unfollowed this user' });
        } catch (error) {
            console.error(`Error unfollowing user ID ${req.params.user_id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getPosts(req, res) {
        try {
            const query = parsePostListQuery(req.query);
            if (query.error) {
                return res.status(400).json({ message: query.error });
            }

            const { page, limit, offset, sort, order, filters } = query;
            const { posts, total } = await Post.findAll({
                user: req.user,
                filters: { ...filters, subscribedBy: req.user.id },
                sort,
                order,
                limit,
                offset,
            });

            return res.status(200).json(buildPostListResponse(posts, total, page, limit));
        } catch (error) {
            console.error('Error fetching subscribed posts:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getCategories(req, res) {
        try {
            const categories = await Subscription.findCategoriesByUser(req.user.id);
            return res.status(200).json(categories);
        } catch (error) {
            console.error('Error fetching subscribed categories:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async subscribeToPost(req, res) {
        try {
            await Subscription.subscribeToPost(req.user.id, req.post.id);
            return res.status(201).json({ message: 'Subscribed to the post' });
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return res.status(409).json({ message: 'You are already subscribed to this post' });
            }
            console.error(`Error subscribing to post ID ${req.post.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async unsubscribeFromPost(req, res) {
        try {
            const removed = await Subscription.unsubscribeFromPost(req.user.id, req.ids.post_id);
            if (!removed) {
                return res.status(404).json({ message: 'You are not subscribed to this post' });
            }
            return res.status(200).json({ message: 'Unsubscribed from the post' });
        } catch (error) {
            console.error(`Error unsubscribing from post ID ${req.ids.post_id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async subscribeToCategory(req, res) {
        try {
            await Subscription.subscribeToCategory(req.user.id, req.category.id);
            return res.status(201).json({ message: 'Subscribed to the category' });
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return res
                    .status(409)
                    .json({ message: 'You are already subscribed to this category' });
            }
            console.error(`Error subscribing to category ID ${req.category.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async unsubscribeFromCategory(req, res) {
        try {
            const removed = await Subscription.unsubscribeFromCategory(
                req.user.id,
                req.category.id
            );
            if (!removed) {
                return res.status(404).json({ message: 'You are not subscribed to this category' });
            }
            return res.status(200).json({ message: 'Unsubscribed from the category' });
        } catch (error) {
            console.error(`Error unsubscribing from category ID ${req.category.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = SubscriptionController;
