const { isDuplicateEntryError } = require('../db/db');
const Post = require('../models/Post');
const User = require('../models/User');
const { removeFiles, toDiskPath, toPublicPath } = require('../utils/uploads');
const { hashPassword } = require('../utils/security');
const {
    normalizeUserFields,
    parsePositiveInt,
    validateUserFields,
} = require('../utils/validators');

const ROLES = ['user', 'admin'];
const UPDATABLE_FIELDS = ['login', 'email', 'password', 'full_name', 'role'];

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

            return res.status(200).json(user);
        } catch (error) {
            console.error(`Error fetching user ID ${req.params.user_id}:`, error);
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
            const user = await User.findById(req.user.id);
            const profilePicture = toPublicPath('avatars', req.file.filename);

            await User.update(req.user.id, { profile_picture: profilePicture });

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
