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