const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { isDuplicateEntryError } = require('../db/db');
const BlacklistedToken = require('../models/BlacklistedToken');
const User = require('../models/User');
const { sendResetPasswordEmail, sendConfirmationEmail } = require('../utils/mailer');
const { generateToken, hashPassword, hashToken } = require('../utils/security');
const {
    isNonEmptyString,
    normalizeUserFields,
    validateUserFields,
} = require('../utils/validators');

const ACCESS_TOKEN_LIFETIME = '3h';
const PASSWORD_RESET_LIFETIME_MS = 60 * 60 * 1000;

class AuthController {
    static async register(req, res) {
        try {
            const { login, password, password_confirmation, full_name, email } =
                normalizeUserFields(req.body);

            if (!login || !password || !password_confirmation || !full_name || !email) {
                return res.status(400).json({ message: 'All fields are required' });
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

            const confirmToken = generateToken();
            const userId = await User.create({
                login,
                password: await hashPassword(password),
                full_name,
                email,
                email_confirm_token: hashToken(confirmToken),
            });

            try {
                await sendConfirmationEmail(email, confirmToken);
            } catch (error) {
                await User.delete(userId);
                console.error('Error sending confirmation email:', error);
                return res.status(502).json({
                    message: 'Could not send the confirmation email, please try again later',
                });
            }

            return res.status(201).json({ message: 'User created successfully' });
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return res.status(409).json({ message: 'Email or login already in use' });
            }
            console.error('Error during registration:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async login(req, res) {
        try {
            const { login, email, password } = req.body;

            const hasLogin = isNonEmptyString(login);
            const hasEmail = isNonEmptyString(email);
            if ((!hasLogin && !hasEmail) || !isNonEmptyString(password)) {
                return res
                    .status(400)
                    .json({ message: 'Provide a password and a login, an email or both' });
            }

            const user = await User.findByCredentials({
                login: hasLogin ? login.trim() : undefined,
                email: hasEmail ? email.trim() : undefined,
            });
            const isPasswordCorrect = user && (await bcrypt.compare(password, user.password));

            if (!isPasswordCorrect) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            if (!user.email_confirmed) {
                return res.status(403).json({ message: 'Email not confirmed' });
            }

            const token = jwt.sign(
                { id: user.id, login: user.login, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: ACCESS_TOKEN_LIFETIME }
            );

            return res.status(200).json({ message: 'Login successful', token });
        } catch (error) {
            console.error('Error during login:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async logout(req, res) {
        try {
            const expiresAt = new Date(req.user.exp * 1000);
            await BlacklistedToken.add(hashToken(req.token), expiresAt);
            return res.status(200).json({ message: 'Logout successful' });
        } catch (error) {
            console.error('Error during logout:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async requestPasswordReset(req, res) {
        try {
            const { email } = req.body;

            if (!isNonEmptyString(email)) {
                return res.status(400).json({ message: 'Email is required' });
            }

            const genericMessage =
                'If this email is registered, a password reset link has been sent.';

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(200).json({ message: genericMessage });
            }

            const resetToken = generateToken();
            const expiresAt = new Date(Date.now() + PASSWORD_RESET_LIFETIME_MS);

            await User.savePasswordResetToken(user.id, hashToken(resetToken), expiresAt);
            await sendResetPasswordEmail(user.email, resetToken);

            return res.status(200).json({ message: genericMessage });
        } catch (error) {
            console.error('Error during password reset request:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async confirmPassReset(req, res) {
        try {
            const { confirm_token } = req.params;
            const { new_password, new_password_confirmation } = req.body;

            if (!new_password || !new_password_confirmation) {
                return res.status(400).json({ message: 'Both password fields are required' });
            }

            const validationError = validateUserFields({
                password: new_password,
                password_confirmation: new_password_confirmation,
            });
            if (validationError) {
                return res.status(400).json({ message: validationError });
            }

            const user = await User.findByValidResetToken(hashToken(confirm_token));
            if (!user) {
                return res.status(400).json({ message: 'Invalid or expired password reset token' });
            }

            await User.updatePassAndClearResetToken(user.id, await hashPassword(new_password));

            return res.status(200).json({ message: 'Password has been successfully reset' });
        } catch (error) {
            console.error('Error during password reset confirmation:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async confirmEmail(req, res) {
        try {
            const user = await User.findByConfirmToken(hashToken(req.params.token));

            if (!user) {
                return res.status(400).json({ message: 'Invalid email confirmation token' });
            }

            await User.confirmEmail(user.id);
            return res.status(200).json({ message: 'Email has been successfully confirmed' });
        } catch (error) {
            console.error('Error during email confirmation:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = AuthController;
