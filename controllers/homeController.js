const Blog = require('../models/Blog');
const Project = require('../models/Project');
const Subscriber = require('../models/Subscriber');
const Newsletter = require('../models/Newsletter');
const WorkExperience = require('../models/WorkExperience');
const Skill = require('../models/Skill');
const Testimonial = require('../models/Testimonial');

exports.toggleSideBar = async (req, res) => {
    req.session.sidebarCollapsed = req.body.sidebarCollapsed;

    res.json({
        message: 'Sidebar toggled',
        sidebar: req.body.sidebarCollapsed,
    });
};

exports.getDashboard = async (req, res) => {
    try {
        const [
            blogTotal, blogPublished,
            projectTotal, projectPublished,
            subscriberTotal, subscriberActive,
            newsletterTotal, newsletterSent,
            workExpTotal, skillTotal, testimonialTotal,
        ] = await Promise.all([
            Blog.countDocuments(),
            Blog.countDocuments({ status: 'published' }),
            Project.countDocuments(),
            Project.countDocuments({ status: 'published' }),
            Subscriber.countDocuments(),
            Subscriber.countDocuments({ status: 'active' }),
            Newsletter.countDocuments(),
            Newsletter.countDocuments({ status: 'sent' }),
            WorkExperience.countDocuments(),
            Skill.countDocuments(),
            Testimonial.countDocuments(),
        ]);

        res.render('home', {
            userId: req.session.userId,
            userName: req.session.name,
            sidebarCollapsed: req.session.sidebarCollapsed || false,
            currentPath: req.path,
            stats: {
                blogTotal, blogPublished,
                projectTotal, projectPublished,
                subscriberTotal, subscriberActive,
                newsletterTotal, newsletterSent,
                workExpTotal, skillTotal, testimonialTotal,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(404).render('error', {
            layout: 'auth',
            heading: 'Server error',
            error,
        });
    }
};

// Public: one-click unsubscribe via token embedded in campaign emails.
exports.unsubscribe = async (req, res) => {
    try {
        const subscriber = await Subscriber.findOne({ unsubscribeToken: req.params.token });

        if (!subscriber) {
            return res.status(404).render('error', {
                layout: 'auth',
                heading: 'Link not found',
                error: 'This unsubscribe link is invalid or has expired.',
            });
        }

        if (subscriber.status !== 'unsubscribed') {
            subscriber.status = 'unsubscribed';
            subscriber.unsubscribedAt = new Date();
            await subscriber.save();
        }

        res.render('error', {
            layout: 'auth',
            success: true,
            heading: 'You have been unsubscribed',
            message: `${subscriber.email} will no longer receive newsletter emails.`,
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('error', {
            layout: 'auth',
            heading: 'Server error',
            error: 'Something went wrong. Please try again later.',
        });
    }
};