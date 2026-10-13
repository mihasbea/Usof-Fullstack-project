const Category = require('../models/Category');
const Post = require('../models/Post');
const NotificationService = require('../services/NotificationService');
const { removeFiles, toDiskPath, toPublicPath } = require('../utils/uploads');
const {
    POST_STATUSES,
    buildPostListResponse,
    parsePostListQuery,
} = require('../utils/postListQuery');
const { MAX_STRING_LENGTH, parseIdList, validateText } = require('../utils/validators');

function validateTitle(title) {
    return validateText(title, 'Title', MAX_STRING_LENGTH);
}

function validateContent(content) {
    return validateText(content, 'Content');
}

async function validateCategories(categories) {
    const categoryIds = parseIdList(categories);
    if (!categoryIds) {
        return { error: 'Categories must be a non-empty list of category IDs' };
    }

    const existingIds = await Category.findExistingIds(categoryIds);
    const missingIds = categoryIds.filter((id) => !existingIds.includes(id));
    if (missingIds.length > 0) {
        return { error: `Categories not found: ${missingIds.join(', ')}` };
    }

    return { categoryIds };
}

function getAttachmentType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype === 'application/pdf') return 'document';
    return 'other';
}

class PostController {
    static async create(req, res) {
        const files = req.files ?? [];
        const filePaths = files.map((file) => file.path);

        try {
            const { title, content, categories } = req.body;

            const textError = validateTitle(title) ?? validateContent(content);
            if (textError) {
                await removeFiles(filePaths);
                return res.status(400).json({ message: textError });
            }

            const { error: categoriesError, categoryIds } = await validateCategories(categories);
            if (categoriesError) {
                await removeFiles(filePaths);
                return res.status(400).json({ message: categoriesError });
            }

            const attachments = files.map((file) => ({
                path: toPublicPath('posts', file.filename),
                type: getAttachmentType(file.mimetype),
            }));

            const postTitle = title.trim();
            const postId = await Post.create({
                author_id: req.user.id,
                title: postTitle,
                content: content.trim(),
                categoryIds,
                attachments,
            });
            await NotificationService.notifyNewPostInCategories(
                { id: postId, title: postTitle },
                categoryIds,
                req.user
            );

            return res.status(201).json({
                message: 'Post created successfully',
                post_id: postId,
                attachments_count: attachments.length,
            });
        } catch (error) {
            await removeFiles(filePaths);
            console.error('Error during post creation:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getAll(req, res) {
        try {
            const query = parsePostListQuery(req.query);
            if (query.error) {
                return res.status(400).json({ message: query.error });
            }

            const { page, limit, offset, sort, order, filters } = query;
            const { posts, total } = await Post.findAll({
                user: req.user,
                filters,
                sort,
                order,
                limit,
                offset,
            });

            return res.status(200).json(buildPostListResponse(posts, total, page, limit));
        } catch (error) {
            console.error('Error fetching posts:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getById(req, res) {
        try {
            const post = await Post.getById(req.post.id, req.user?.id);
            return res.status(200).json(post);
        } catch (error) {
            console.error(`Error fetching post ID ${req.post.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getCategories(req, res) {
        try {
            const categories = await Post.getCategories(req.post.id);
            return res.status(200).json(categories);
        } catch (error) {
            console.error(`Error fetching categories of post ID ${req.post.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async update(req, res) {
        try {
            const isAuthor = req.post.author_id === req.user.id;
            const isAdmin = req.user.role === 'admin';

            if (!isAuthor && !isAdmin) {
                return res
                    .status(403)
                    .json({ message: 'Only the author or an admin can update this post' });
            }

            const { title, content, categories, status } = req.body;
            const changes = {};

            if ((title !== undefined || content !== undefined) && !isAuthor) {
                return res
                    .status(403)
                    .json({ message: 'Only the author can change the title and content' });
            }
            if (status !== undefined && !isAdmin) {
                return res.status(403).json({ message: 'Only an admin can change the status' });
            }

            if (title !== undefined) {
                const titleError = validateTitle(title);
                if (titleError) {
                    return res.status(400).json({ message: titleError });
                }
                changes.title = title.trim();
            }

            if (content !== undefined) {
                const contentError = validateContent(content);
                if (contentError) {
                    return res.status(400).json({ message: contentError });
                }
                changes.content = content.trim();
            }

            if (status !== undefined) {
                if (!POST_STATUSES.includes(status)) {
                    return res
                        .status(400)
                        .json({ message: `Status must be one of: ${POST_STATUSES.join(', ')}` });
                }
                changes.status = status;
            }

            let categoryIds;
            if (categories !== undefined) {
                const result = await validateCategories(categories);
                if (result.error) {
                    return res.status(400).json({ message: result.error });
                }
                categoryIds = result.categoryIds;
            }

            if (Object.keys(changes).length === 0 && !categoryIds) {
                return res.status(400).json({
                    message:
                        'Provide at least one field to update: title, content, categories, status',
                });
            }

            await Post.update(req.post.id, changes, categoryIds);
            const post = await Post.getById(req.post.id, req.user.id);

            const changedFields = categoryIds
                ? [...Object.keys(changes), 'categories']
                : Object.keys(changes);
            await NotificationService.notifyPostUpdated(post, changedFields, req.user);

            return res.status(200).json({ message: 'Post updated successfully', post });
        } catch (error) {
            console.error(`Error updating post ID ${req.post.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async delete(req, res) {
        try {
            const isAuthor = req.post.author_id === req.user.id;
            const isAdmin = req.user.role === 'admin';

            if (!isAuthor && !isAdmin) {
                return res
                    .status(403)
                    .json({ message: 'Only the author or an admin can delete this post' });
            }

            const attachmentPaths = await Post.delete(req.post.id);
            await removeFiles(attachmentPaths.map(toDiskPath));

            return res.status(200).json({ message: 'Post deleted successfully' });
        } catch (error) {
            console.error(`Error deleting post ID ${req.post.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = PostController;
