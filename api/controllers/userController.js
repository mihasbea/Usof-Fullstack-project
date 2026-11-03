const { isDuplicateEntryError } = require('../db/db');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { buildPagination, parsePagination } = require('../utils/pagination');
const { buildPostListResponse, parsePostListQuery } = require('../utils/postListQuery');
const { removeFiles, toDiskPath, toPublicPath } = require('../utils/uploads');
const { hashPassword } = require('../utils/security');
const {
    normalizeUserFields,
    parsePositiveInt,
    validateUserFields,
} = require('../utils/validators');

const ROLES = ['user', 'admin'];
const UPDATABLE_FIELDS = ['login', 'email', 'password', 'full_name', 'role', 'email_confirmed'];

function canSeePrivateData(currentUser, userId) {
    return currentUser?.role === 'admin' || currentUser?.id === userId;
}

function pickUpdateData(body) {
    const updateData = {};
    for (const field of UPDATABLE_FIELDS) {
        if (body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }
    return updateData;
}

function checkRoleChange(currentUser, userId, role) {
    if (role === undefined) {
        return null;
    }
    if (currentUser.role !== 'admin') {
        return { status: 403, message: 'Only an admin can change roles' };
    }
    if (currentUser.id === userId) {
        return { status: 403, message: 'You cannot change your own role' };
    }
    if (!ROLES.includes(role)) {
        return { status: 400, message: `Role must be one of: ${ROLES.join(', ')}` };
    }
    return null;
}

class UserController {
    static async getDirectory(req, res) {
        try {
            const pagination = parsePagination(req.query, 20);
            if (pagination.error) {
                return res.status(400).json({ message: pagination.error });
            }

            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            if (search.length > 255) {
                return res
                    .status(400)
                    .json({ message: 'Search must be at most 255 characters long' });
            }

            const { users, total } = await User.findPublicDirectory({
                search,
                viewerId: req.user?.id,
                limit: pagination.limit,
                offset: pagination.offset,
            });
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
            console.error('Error fetching author directory:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getAll(req, res) {
        try {
            const users =
                req.user?.role === 'admin'
                    ? await User.findAllProfiles()
                    : await User.findAllPublic();
            return res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getById(req, res) {
        try {
            const userId = parsePositiveInt(req.params.user_id);
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }

            const user = canSeePrivateData(req.user, userId)
                ? await User.findById(userId)
                : await User.findPublicById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const canSeePrivateProfile = canSeePrivateData(req.user, userId);
            if (
                req.query.include_all_posts !== undefined &&
                !['true', 'false'].includes(req.query.include_all_posts)
            ) {
                return res.status(400).json({ message: 'include_all_posts must be true or false' });
            }
            const includeAllPosts =
                req.query.include_all_posts === 'true' &&
                req.user?.role === 'admin' &&
                req.user.id === userId;
            if (req.query.include_all_posts === 'true' && !includeAllPosts) {
                return res.status(403).json({ message: 'Only an admin can view all posts here' });
            }
            const [stats, activity, profileActivity] = await Promise.all([
                Subscription.getUserStats(userId, req.user?.id),
                canSeePrivateProfile ? Promise.resolve({}) : User.getPublicActivityCounts(userId),
                canSeePrivateProfile
                    ? User.getProfileActivityCounts(userId, includeAllPosts)
                    : Promise.resolve({}),
            ]);
            const response = {
                ...user,
                ...stats,
                ...activity,
                ...profileActivity,
            };
            if (canSeePrivateProfile) {
                response.post_count = profileActivity.profile_post_count;
                response.comment_count = profileActivity.profile_comment_count;
                response.category_count = profileActivity.profile_category_count;
            }
            return res.status(200).json(response);
        } catch (error) {
            console.error(`Error fetching user ID ${req.params.user_id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getPosts(req, res) {
        try {
            const userId = parsePositiveInt(req.params.user_id);
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }

            const query = parsePostListQuery(req.query);
            if (query.error) {
                return res.status(400).json({ message: query.error });
            }

            const includeAllAuthors = req.query.all_authors === 'true';
            if (
                req.query.all_authors !== undefined &&
                !['true', 'false'].includes(req.query.all_authors)
            ) {
                return res.status(400).json({ message: 'all_authors must be true or false' });
            }
            if (includeAllAuthors && (req.user?.role !== 'admin' || req.user.id !== userId)) {
                return res.status(403).json({ message: 'Only an admin can view all posts here' });
            }

            const { posts, total } = await Post.findAll({
                user: req.user,
                filters: {
                    ...query.filters,
                    ...(!includeAllAuthors ? { authorId: userId } : {}),
                },
                sort: query.sort,
                order: query.order,
                limit: query.limit,
                offset: query.offset,
            });
            return res
                .status(200)
                .json(buildPostListResponse(posts, total, query.page, query.limit));
        } catch (error) {
            console.error(`Error fetching posts for user ID ${req.params.user_id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getComments(req, res) {
        try {
            const userId = parsePositiveInt(req.params.user_id);
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }

            const pagination = parsePagination(req.query, 10);
            if (pagination.error) {
                return res.status(400).json({ message: pagination.error });
            }

            const { comments, total } = canSeePrivateData(req.user, userId)
                ? await Comment.findByAuthor(userId, pagination)
                : await Comment.findPublicByAuthor(userId, pagination);
            return res.status(200).json({
                data: comments,
                pagination: buildPagination(
                    'total_comments',
                    total,
                    pagination.page,
                    pagination.limit
                ),
            });
        } catch (error) {
            console.error(`Error fetching comments for user ID ${req.params.user_id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getFollowers(req, res) {
        try {
            const userId = parsePositiveInt(req.params.user_id);
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }
            if (!(await User.findPublicById(userId))) {
                return res.status(404).json({ message: 'User not found' });
            }

            const pagination = parsePagination(req.query, 20);
            if (pagination.error) {
                return res.status(400).json({ message: pagination.error });
            }
            const { users, total } = await Subscription.findFollowers(
                userId,
                pagination,
                req.user?.id
            );
            return res.status(200).json({
                data: users,
                pagination: buildPagination(
                    'total_followers',
                    total,
                    pagination.page,
                    pagination.limit
                ),
            });
        } catch (error) {
            console.error(`Error fetching followers for user ID ${req.params.user_id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getCategories(req, res) {
        try {
            const userId = parsePositiveInt(req.params.user_id);
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }

            const categories = await Category.findOwnedBy(userId);
            return res.status(200).json(categories);
        } catch (error) {
            console.error(`Error fetching categories for user ID ${req.params.user_id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async create(req, res) {
        try {
            const { login, password, password_confirmation, full_name, email, role } =
                normalizeUserFields(req.body);

            if (!login || !password || !password_confirmation || !full_name || !email || !role) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            if (!ROLES.includes(role)) {
                return res
                    .status(400)
                    .json({ message: `Role must be one of: ${ROLES.join(', ')}` });
            }

            const validationError = validateUserFields({
                login,
                password,
                password_confirmation,
                full_name,
                email,
            });
            if (validationError) {
                return res.status(400).json({ message: validationError });
            }

            if (await User.findByLoginOrEmail(login, email)) {
                return res.status(409).json({ message: 'Email or login already in use' });
            }

            const userId = await User.create({
                login,
                password: await hashPassword(password),
                full_name,
                email,
                role,
                email_confirmed: true,
            });
            const user = await User.findById(userId);

            return res.status(201).json({ message: 'User created successfully', user });
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return res.status(409).json({ message: 'Email or login already in use' });
            }
            console.error('Error during admin user creation:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async uploadAvatar(req, res) {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image file' });
        }

        try {
            const userId = parsePositiveInt(req.params.user_id) ?? req.user.id;
            const user = await User.findById(userId);
            if (!user) {
                await removeFiles([req.file.path]);
                return res.status(404).json({ message: 'User not found' });
            }
            const profilePicture = toPublicPath('avatars', req.file.filename);

            await User.update(userId, { profile_picture: profilePicture });

            if (user?.profile_picture) {
                await removeFiles([toDiskPath(user.profile_picture)]);
            }

            return res
                .status(200)
                .json({ message: 'Avatar uploaded successfully', profile_picture: profilePicture });
        } catch (error) {
            await removeFiles([req.file.path]);
            console.error('Error during avatar upload:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async update(req, res) {
        try {
            const userId = parsePositiveInt(req.params.user_id);
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }

            const updateData = normalizeUserFields(pickUpdateData(req.body));
            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    message: `Provide at least one field to update: ${UPDATABLE_FIELDS.join(', ')}`,
                });
            }

            const roleError = checkRoleChange(req.user, userId, updateData.role);
            if (roleError) {
                return res.status(roleError.status).json({ message: roleError.message });
            }
            if (updateData.email_confirmed !== undefined) {
                if (req.user.role !== 'admin') {
                    return res
                        .status(403)
                        .json({ message: 'Only an admin can change email confirmation status' });
                }
                if (typeof updateData.email_confirmed !== 'boolean') {
                    return res
                        .status(400)
                        .json({ message: 'Email confirmation status must be true or false' });
                }
            }

            const validationError = validateUserFields({
                ...updateData,
                password_confirmation: req.body.password_confirmation,
            });
            if (validationError) {
                return res.status(400).json({ message: validationError });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (updateData.login && updateData.login !== user.login) {
                if (await User.findByLogin(updateData.login)) {
                    return res.status(409).json({ message: 'Login is already taken' });
                }
            }

            if (updateData.email && updateData.email !== user.email) {
                if (await User.findByEmail(updateData.email)) {
                    return res.status(409).json({ message: 'Email is already taken' });
                }
            }

            if (updateData.password) {
                updateData.password = await hashPassword(updateData.password);
            }

            await User.update(userId, updateData);
            const updatedUser = await User.findById(userId);

            return res
                .status(200)
                .json({ message: 'User updated successfully', user: updatedUser });
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return res.status(409).json({ message: 'Login or email is already taken' });
            }
            console.error('Error during user update:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async delete(req, res) {
        try {
            const userId = parsePositiveInt(req.params.user_id);
            if (!userId) {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const attachmentPaths = await Post.findAttachmentPathsByAuthor(userId);
            await User.delete(userId);

            const publicPaths = [user.profile_picture, ...attachmentPaths].filter(Boolean);
            await removeFiles(publicPaths.map(toDiskPath));

            return res.status(200).json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error during user deletion:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = UserController;
