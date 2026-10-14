const { isDuplicateEntryError } = require('../db/db');
const Favorite = require('../models/Favorite');
const Post = require('../models/Post');
const { buildPostListResponse, parsePostListQuery } = require('../utils/postListQuery');

class FavoriteController {
    static async getAll(req, res) {
        try {
            const query = parsePostListQuery(req.query);
            if (query.error) {
                return res.status(400).json({ message: query.error });
            }

            const { page, limit, offset, sort, order, filters } = query;
            const { posts, total } = await Post.findAll({
                user: req.user,
                filters: { ...filters, favoriteOf: req.user.id },
                sort,
                order,
                limit,
                offset,
            });

            return res.status(200).json(buildPostListResponse(posts, total, page, limit));
        } catch (error) {
            console.error('Error fetching favorite posts:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async add(req, res) {
        try {
            await Favorite.add(req.user.id, req.post.id);
            return res.status(201).json({ message: 'Post added to favorites' });
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return res.status(409).json({ message: 'The post is already in your favorites' });
            }
            console.error(`Error adding post ID ${req.post.id} to favorites:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async remove(req, res) {
        try {
            const removed = await Favorite.remove(req.user.id, req.ids.post_id);
            if (!removed) {
                return res.status(404).json({ message: 'The post is not in your favorites' });
            }
            return res.status(200).json({ message: 'Post removed from favorites' });
        } catch (error) {
            console.error(`Error removing post ID ${req.ids.post_id} from favorites:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = FavoriteController;
