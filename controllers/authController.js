const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

const { isValidEmail } = require('../modules/checkValidForm');

exports.renderLoginPage = async (req, res) => {
    try {
        res.render('login', { layout: 'auth' });
    } catch (error) {
        res.status(500).json({
            error: 'An error occurred while rendering login page',
            details: error.message,
        });
    }
};

function generateMagicToken(email) {
    return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '60m' });
}

async function sendMagicLinkEmail(name, email, link) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.zoho.eu',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });

    const templatePath = path.join(__dirname, '../views/emails/magicLink.hbs');
    const templateSource = await fs.readFile(templatePath, 'utf8');
    const compiledTemplate = handlebars.compile(templateSource);

    const html = compiledTemplate({
        name,
        magicLink: link,
    });

    await transporter.sendMail({
        from: `"iLearningHubb" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Login to Dashboard - Magic Link',
        html,
    });
}

exports.sendMagicLink = async (req, res) => {
    try {
        const { email: emailProvided } = req.body;

        const email = emailProvided.toLowerCase();

        if (!isValidEmail(email)) {
            res.status(400).send(`${email} is an invalid email.`);
            return false;
        }

        let user = await User.findOne({ email });

        if (!user) {
            res.status(404).send(`No account found for ${email}.`);
            return false;
        }

        const token = generateMagicToken(email);
        const link = `${process.env.DOMAIN_URL}/auth-magic-link?token=${token}`;
        await sendMagicLinkEmail(user.name, user.email, link);
        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while sending magic link',
            details: error.message,
        });
    }
};

exports.testMagicLink = async (req, res) => {
    try {
        const token = req.query.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await User.findOne({ email: decoded.email });
        if (!user) {
            res.status(404).send('User not found');
            return;
        };
        req.session.userId = user._id;
        req.session.email = user.email;
        req.session.name = user.name;
        
        req.session.save(() => {
            res.redirect('/dashboard');
        });
    } catch (e) {
        res.render('login', { 
            layout: 'auth', 
            note: 'Invalid / expired login link. Please create a new login link.' 
        });
    }
};

exports.logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/login');
    } catch (error) {
        res.status(400).send('Error logging out, please try again.');
    }
}