const { isDuplicateEntryError } = require('../db/db');
const Post = require('../models/Post');
const Subscription = require('../models/Subscription');
const { buildPostListResponse, parsePostListQuery } = require('../utils/postListQuery');

class SubscriptionController {
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
