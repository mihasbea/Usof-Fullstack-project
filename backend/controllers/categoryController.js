const { isDuplicateEntryError } = require('../db/db');
const Category = require('../models/Category');
const Post = require('../models/Post');
const CategoryDeletionService = require('../services/CategoryDeletionService');
const { buildPostListResponse, parsePostListQuery } = require('../utils/postListQuery');
const { MAX_STRING_LENGTH, validateText } = require('../utils/validators');

const MAX_DESCRIPTION_LENGTH = 1000;

function validateTitle(title) {
    return validateText(title, 'Title', MAX_STRING_LENGTH);
}

function parseDescription(description) {
    if (description === null) {
        return { value: null };
    }
    if (typeof description !== 'string') {
        return { error: 'Description must be a string or null' };
    }

    const value = description.trim();
    if (value.length > MAX_DESCRIPTION_LENGTH) {
        return {
            error: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters long`,
        };
    }
    return { value: value || null };
}

class CategoryController {
    static async getAll(req, res) {
        try {
            const categories = await Category.findAll();
            return res.status(200).json(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getById(req, res) {
        return res.status(200).json(req.category);
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
                filters: { ...filters, categoryIds: [req.category.id] },
                sort,
                order,
                limit,
                offset,
            });

            return res.status(200).json(buildPostListResponse(posts, total, page, limit));
        } catch (error) {
            console.error(`Error fetching posts of category ID ${req.category.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async create(req, res) {
        try {
            const { title, description } = req.body;

            const titleError = validateTitle(title);
            if (titleError) {
                return res.status(400).json({ message: titleError });
            }

            let descriptionValue = null;
            if (description !== undefined) {
                const parsed = parseDescription(description);
                if (parsed.error) {
                    return res.status(400).json({ message: parsed.error });
                }
                descriptionValue = parsed.value;
            }

            const categoryId = await Category.create({
                title: title.trim(),
                description: descriptionValue,
            });
            const category = await Category.findById(categoryId);

            return res.status(201).json({ message: 'Category created successfully', category });
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return res
                    .status(409)
                    .json({ message: 'A category with this title already exists' });
            }
            console.error('Error creating a category:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async update(req, res) {
        try {
            const { title, description } = req.body;
            const changes = {};

            if (title !== undefined) {
                const titleError = validateTitle(title);
                if (titleError) {
                    return res.status(400).json({ message: titleError });
                }
                changes.title = title.trim();
            }

            if (description !== undefined) {
                const parsed = parseDescription(description);
                if (parsed.error) {
                    return res.status(400).json({ message: parsed.error });
                }
                changes.description = parsed.value;
            }

            if (Object.keys(changes).length === 0) {
                return res
                    .status(400)
                    .json({ message: 'Provide at least one field to update: title, description' });
            }

            await Category.update(req.category.id, changes);
            const category = await Category.findById(req.category.id);

            return res.status(200).json({ message: 'Category updated successfully', category });
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return res
                    .status(409)
                    .json({ message: 'A category with this title already exists' });
            }
            console.error(`Error updating category ID ${req.category.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async delete(req, res) {
        try {
            const { affectedPosts, notifiedUsers } = await CategoryDeletionService.delete(
                req.category
            );

            return res.status(200).json({
                message: 'Category deleted successfully',
                affected_posts: affectedPosts,
                notified_users: notifiedUsers,
            });
        } catch (error) {
            console.error(`Error deleting category ID ${req.category.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = CategoryController;
