const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendEmail } = require('../config/resend');
const { isValidEmail } = require('../modules/checkValidForm');

// ─── Login ──────────────────────────────────────────────────────────────────

exports.renderLoginPage = (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('login', { layout: 'auth' });
};

exports.login = async (req, res) => {
    try {
        const email = (req.body.email || '').toLowerCase().trim();
        const { password } = req.body;

        if (!isValidEmail(email) || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await User.findOne({ email });
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        req.session.userId = user._id;
        req.session.email  = user.email;
        req.session.name   = user.name;

        req.session.save(() => res.json({ success: true }));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
};

// ─── Forgot Password ─────────────────────────────────────────────────────────

exports.renderForgotPasswordPage = (req, res) => {
    res.render('forgot-password', { layout: 'auth' });
};

exports.forgotPassword = async (req, res) => {
    try {
        const email = (req.body.email || '').toLowerCase().trim();

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        const user = await User.findOne({ email });

        // Always respond with success to prevent email enumeration
        if (!user) {
            return res.json({ success: true });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken   = rawToken;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        const resetUrl = `${process.env.DOMAIN_URL}/reset-password?token=${rawToken}`;

        await sendEmail({
            to: user.email,
            subject: 'Reset your password',
            html: `
                <p>Hi ${user.name},</p>
                <p>You requested a password reset. Click the link below to set a new password.
                   The link expires in <strong>1 hour</strong>.</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>If you didn't request this, you can ignore this email.</p>
            `,
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
};

// ─── Reset Password ───────────────────────────────────────────────────────────

exports.renderResetPasswordPage = async (req, res) => {
    const { token } = req.query;

    const user = await User.findOne({
        resetPasswordToken:   token,
        resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
        return res.render('reset-password', {
            layout: 'auth',
            invalid: true,
        });
    }

    res.render('reset-password', { layout: 'auth', token });
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        const user = await User.findOne({
            resetPasswordToken:   token,
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
        }

        user.password             = await bcrypt.hash(password, 12);
        user.resetPasswordToken   = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

exports.logout = (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
};
