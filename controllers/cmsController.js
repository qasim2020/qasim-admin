const Blog = require('../models/Blog');
const Project = require('../models/Project');
const Tag = require('../models/Tag');
const Category = require('../models/Category');
const Subscriber = require('../models/Subscriber');
const Newsletter = require('../models/Newsletter');
const WorkExperience = require('../models/WorkExperience');
const Skill = require('../models/Skill');
const SiteSettings = require('../models/SiteSettings');
const Testimonial = require('../models/Testimonial');
const { sendEmail } = require('../config/resend');

// ─── Shared helpers ────────────────────────────────────────────────────────────

const rd = (req, extra = {}) => ({
    userId: req.session.userId,
    userName: req.session.name,
    sidebarCollapsed: req.session.sidebarCollapsed || false,
    ...extra,
});

function slugify(str) {
    return (str || '').toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function errResponse(res, err) {
    const message = err.code === 11000
        ? 'A record with that value already exists (duplicate key).'
        : err.message;
    return res.status(400).json({ error: message });
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ uploaded: 0, error: { message: 'No file uploaded' } });
        // CKEditor 4 uploadimage plugin expects: { uploaded: 1, fileName, url }
        res.json({ uploaded: 1, fileName: req.file.filename || req.file.originalname, url: req.file.path });
    } catch (err) {
        console.error('Image upload error:', err);
        res.status(500).json({ error: { message: err.message || 'Upload failed' } });
    }
};

exports.getBlogPage = async (req, res) => {
    try {
        const LIMIT = 12;
        const page  = Math.max(1, parseInt(req.query.page) || 1);
        const q     = (req.query.q || '').trim();
        const filter = q ? { title: { $regex: q, $options: 'i' } } : {};
        const skip  = (page - 1) * LIMIT;

        const [items, total, tags, categories] = await Promise.all([
            Blog.find(filter)
                .populate('author', 'name')
                .populate('tags', 'name')
                .populate('categories', 'name')
                .sort({ publishedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(LIMIT)
                .lean(),
            Blog.countDocuments(filter),
            Tag.find().sort({ name: 1 }).lean(),
            Category.find().sort({ name: 1 }).lean(),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / LIMIT));

        // Build compact page-window: [1, null, p-1, p, p+1, null, last]
        function buildPages(cur, last) {
            if (last <= 7) return Array.from({ length: last }, (_, i) => ({ num: i + 1, active: i + 1 === cur }));
            const pages = [];
            const add = (n) => pages.push(n === null ? { num: null, ellipsis: true } : { num: n, active: n === cur });
            add(1);
            if (cur > 3) add(null);
            for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) add(i);
            if (cur < last - 2) add(null);
            add(last);
            return pages;
        }

        res.render('cms/blog', rd(req, {
            items,
            tags,
            categories,
            pagination: {
                page, totalPages, total, q,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                prevPage: page - 1,
                nextPage: page + 1,
                from: total ? skip + 1 : 0,
                to: Math.min(skip + LIMIT, total),
                pages: buildPages(page, totalPages),
            },
        }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.createBlog = async (req, res) => {
    try {
        const data = { ...req.body, author: req.session.userId };
        if (!data.slug) data.slug = slugify(data.title);
        if (data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();
        if (typeof data.featured === 'string') data.featured = data.featured === 'true';
        const item = await Blog.create(data);
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.getBlogEditor = async (req, res) => {
    try {
        const item = await Blog.findById(req.params.id).lean();
        if (!item) return res.status(404).render('error', { layout: 'auth', heading: '404', error: 'Post not found' });
        res.render('cms/blog-editor', { layout: false, item, title: item.title });
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.getBlogView = async (req, res) => {
    try {
        const item = await Blog.findById(req.params.id)
            .populate('tags', 'name')
            .populate('categories', 'name')
            .populate('author', 'name')
            .lean();
        if (!item) return res.status(404).render('error', { layout: 'auth', heading: '404', error: 'Post not found' });
        const [tags, categories] = await Promise.all([
            Tag.find().sort({ name: 1 }).lean(),
            Category.find().sort({ name: 1 }).lean(),
        ]);
        res.render('cms/blog-view', rd(req, { item, tags, categories, title: item.title }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.getBlog = async (req, res) => {
    try {
        const item = await Blog.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateBlog = async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();
        if (typeof data.featured === 'string') data.featured = data.featured === 'true';
        const item = await Blog.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.deleteBlog = async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Projects ─────────────────────────────────────────────────────────────────

exports.getProjectsPage = async (req, res) => {
    try {
        const [items, tags, categories] = await Promise.all([
            Project.find().sort({ order: 1, createdAt: -1 }).lean(),
            Tag.find().sort({ name: 1 }).lean(),
            Category.find().sort({ name: 1 }).lean(),
        ]);
        res.render('cms/projects', rd(req, { items, tags, categories }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.createProject = async (req, res) => {
    try {
        const data = { ...req.body };
        if (!data.slug) data.slug = slugify(data.title);
        if (typeof data.techStack === 'string') {
            data.techStack = data.techStack.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (typeof data.featured === 'string') data.featured = data.featured === 'true';
        if (data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();
        const item = await Project.create(data);
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.getProject = async (req, res) => {
    try {
        const item = await Project.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateProject = async (req, res) => {
    try {
        const data = { ...req.body };
        if (typeof data.techStack === 'string') {
            data.techStack = data.techStack.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (typeof data.featured === 'string') data.featured = data.featured === 'true';
        if (data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();
        const item = await Project.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.deleteProject = async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

exports.getTagsPage = async (req, res) => {
    try {
        const items = await Tag.find().sort({ name: 1 }).lean();
        res.render('cms/tags', rd(req, { items }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.createTag = async (req, res) => {
    try {
        const item = await Tag.create(req.body);
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.getTag = async (req, res) => {
    try {
        const item = await Tag.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateTag = async (req, res) => {
    try {
        const item = await Tag.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.deleteTag = async (req, res) => {
    try {
        await Tag.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Categories ───────────────────────────────────────────────────────────────

exports.getCategoriesPage = async (req, res) => {
    try {
        const items = await Category.find().sort({ name: 1 }).lean();
        res.render('cms/categories', rd(req, { items }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const data = { ...req.body };
        if (!data.slug) data.slug = slugify(data.name);
        const item = await Category.create(data);
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.getCategory = async (req, res) => {
    try {
        const item = await Category.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateCategory = async (req, res) => {
    try {
        const item = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Subscribers ──────────────────────────────────────────────────────────────

exports.getSubscribersPage = async (req, res) => {
    try {
        const items = await Subscriber.find().sort({ subscribedAt: -1 });
        const counts = {
            total: items.length,
            active: items.filter(s => s.status === 'active').length,
            unsubscribed: items.filter(s => s.status === 'unsubscribed').length,
        };
        res.render('cms/subscribers', rd(req, { items, counts }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.createSubscriber = async (req, res) => {
    try {
        const item = await Subscriber.create(req.body);
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.getSubscriber = async (req, res) => {
    try {
        const item = await Subscriber.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateSubscriber = async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.status === 'unsubscribed' && !data.unsubscribedAt) data.unsubscribedAt = new Date();
        const item = await Subscriber.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.deleteSubscriber = async (req, res) => {
    try {
        await Subscriber.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Newsletters ──────────────────────────────────────────────────────────────

exports.getNewslettersPage = async (req, res) => {
    try {
        const items = await Newsletter.find().sort({ createdAt: -1 });
        res.render('cms/newsletters', rd(req, { items }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.createNewsletter = async (req, res) => {
    try {
        const item = await Newsletter.create(req.body);
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.getNewsletter = async (req, res) => {
    try {
        const item = await Newsletter.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateNewsletter = async (req, res) => {
    try {
        const existing = await Newsletter.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Not found' });

        const data = { ...req.body };
        const isSending = data.status === 'sent' && existing.status !== 'sent';

        if (isSending) {
            const subscribers = await Subscriber.find({ status: 'active' });
            if (subscribers.length === 0) {
                return res.status(400).json({ error: 'No active subscribers to send to.' });
            }
            const html = data.bodyHtml || `<h1>${data.subject || existing.subject}</h1>`;
            const subject = data.subject || existing.subject;

            // Send to all active subscribers; log failures but don't abort
            const results = await Promise.allSettled(
                subscribers.map(sub =>
                    sendEmail({ to: sub.email, subject, html })
                )
            );
            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed > 0) console.warn(`Newsletter send: ${failed} failed out of ${subscribers.length}`);

            data.sentAt = new Date();
            data.recipientCount = subscribers.length;
        }

        const item = await Newsletter.findByIdAndUpdate(req.params.id, data, { new: true });
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.deleteNewsletter = async (req, res) => {
    try {
        await Newsletter.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Work Experience ──────────────────────────────────────────────────────────

exports.getWorkExperiencePage = async (req, res) => {
    try {
        const items = await WorkExperience.find().sort({ order: 1, startDate: -1 });
        res.render('cms/work-experience', rd(req, { items }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.createWorkExperience = async (req, res) => {
    try {
        const data = { ...req.body };
        if (typeof data.current === 'string') data.current = data.current === 'true';
        if (data.current) data.endDate = undefined;
        const item = await WorkExperience.create(data);
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.getWorkExperienceOne = async (req, res) => {
    try {
        const item = await WorkExperience.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateWorkExperience = async (req, res) => {
    try {
        const data = { ...req.body };
        if (typeof data.current === 'string') data.current = data.current === 'true';
        const item = await WorkExperience.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.deleteWorkExperience = async (req, res) => {
    try {
        await WorkExperience.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Skills ───────────────────────────────────────────────────────────────────

exports.getSkillsPage = async (req, res) => {
    try {
        const items = await Skill.find().sort({ order: 1, name: 1 });
        res.render('cms/skills', rd(req, { items }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.createSkill = async (req, res) => {
    try {
        const item = await Skill.create(req.body);
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.getSkill = async (req, res) => {
    try {
        const item = await Skill.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateSkill = async (req, res) => {
    try {
        const item = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.deleteSkill = async (req, res) => {
    try {
        await Skill.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Testimonials ─────────────────────────────────────────────────────────────

exports.getTestimonialsPage = async (req, res) => {
    try {
        const items = await Testimonial.find().sort({ order: 1, createdAt: -1 });
        res.render('cms/testimonials', rd(req, { items }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.createTestimonial = async (req, res) => {
    try {
        const data = { ...req.body };
        if (typeof data.featured === 'string') data.featured = data.featured === 'true';
        const item = await Testimonial.create(data);
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.getTestimonial = async (req, res) => {
    try {
        const item = await Testimonial.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateTestimonial = async (req, res) => {
    try {
        const data = { ...req.body };
        if (typeof data.featured === 'string') data.featured = data.featured === 'true';
        const item = await Testimonial.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};

exports.deleteTestimonial = async (req, res) => {
    try {
        await Testimonial.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── Site Settings ────────────────────────────────────────────────────────────

exports.getSiteSettingsPage = async (req, res) => {
    try {
        const settings = await SiteSettings.findOne().lean();
        res.render('cms/site-settings', rd(req, { settings }));
    } catch (err) {
        res.status(500).render('error', { layout: 'auth', heading: 'Error', error: err });
    }
};

exports.saveSiteSettings = async (req, res) => {
    try {
        const existing = await SiteSettings.findOne();
        let item;
        if (existing) {
            item = await SiteSettings.findByIdAndUpdate(existing._id, req.body, { new: true, runValidators: true });
        } else {
            item = await SiteSettings.create(req.body);
        }
        res.json({ success: true, item });
    } catch (err) { errResponse(res, err); }
};
