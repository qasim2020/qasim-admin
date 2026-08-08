const express = require('express');
const router = express.Router();
const requireLogin = require('../modules/authenticate');
const cms = require('../controllers/cmsController');
const { upload, uploadProjects } = require('../config/cloudinary');

// ─── Blog ─────────────────────────────────────────────────────────────────────
router.get('/blogs', requireLogin, cms.getBlogPage);
router.post('/blogs', requireLogin, cms.createBlog);
router.post('/blogs/upload-image', requireLogin, upload.single('upload'), cms.uploadImage);
router.post('/blogs/delete-image', requireLogin, cms.deleteImage);
router.get('/blogs/:id/view', requireLogin, cms.getBlogView);
router.get('/blogs/:id/edit', requireLogin, cms.getBlogEditor);
router.get('/blogs/:id', requireLogin, cms.getBlog);
router.put('/blogs/:id', requireLogin, cms.updateBlog);
router.delete('/blogs/:id', requireLogin, cms.deleteBlog);

// ─── Projects ─────────────────────────────────────────────────────────────────
router.get('/projects', requireLogin, cms.getProjectsPage);
router.post('/projects', requireLogin, cms.createProject);
router.post('/projects/upload-image', requireLogin, uploadProjects.single('upload'), cms.uploadImage);
router.get('/projects/:id', requireLogin, cms.getProject);
router.put('/projects/:id', requireLogin, cms.updateProject);
router.delete('/projects/:id', requireLogin, cms.deleteProject);

// ─── Tags ─────────────────────────────────────────────────────────────────────
router.get('/tags', requireLogin, cms.getTagsPage);
router.post('/tags', requireLogin, cms.createTag);
router.get('/tags/:id', requireLogin, cms.getTag);
router.put('/tags/:id', requireLogin, cms.updateTag);
router.delete('/tags/:id', requireLogin, cms.deleteTag);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', requireLogin, cms.getCategoriesPage);
router.post('/categories', requireLogin, cms.createCategory);
router.get('/categories/:id', requireLogin, cms.getCategory);
router.put('/categories/:id', requireLogin, cms.updateCategory);
router.delete('/categories/:id', requireLogin, cms.deleteCategory);

// ─── Subscribers ──────────────────────────────────────────────────────────────
router.get('/subscribers', requireLogin, cms.getSubscribersPage);
router.post('/subscribers', requireLogin, cms.createSubscriber);
router.get('/subscribers/:id', requireLogin, cms.getSubscriber);
router.put('/subscribers/:id', requireLogin, cms.updateSubscriber);
router.delete('/subscribers/:id', requireLogin, cms.deleteSubscriber);

// ─── Newsletters ──────────────────────────────────────────────────────────────
router.get('/newsletters', requireLogin, cms.getNewslettersPage);
router.post('/newsletters', requireLogin, cms.createNewsletter);
router.get('/newsletters/:id', requireLogin, cms.getNewsletter);
router.put('/newsletters/:id', requireLogin, cms.updateNewsletter);
router.delete('/newsletters/:id', requireLogin, cms.deleteNewsletter);

// ─── Work Experience ──────────────────────────────────────────────────────────
router.get('/work-experience', requireLogin, cms.getWorkExperiencePage);
router.post('/work-experience', requireLogin, cms.createWorkExperience);
router.get('/work-experience/:id', requireLogin, cms.getWorkExperienceOne);
router.put('/work-experience/:id', requireLogin, cms.updateWorkExperience);
router.delete('/work-experience/:id', requireLogin, cms.deleteWorkExperience);

// ─── Skills ───────────────────────────────────────────────────────────────────
router.get('/skills', requireLogin, cms.getSkillsPage);
router.post('/skills', requireLogin, cms.createSkill);
router.get('/skills/:id', requireLogin, cms.getSkill);
router.put('/skills/:id', requireLogin, cms.updateSkill);
router.delete('/skills/:id', requireLogin, cms.deleteSkill);

// ─── Testimonials ─────────────────────────────────────────────────────────────
router.get('/testimonials', requireLogin, cms.getTestimonialsPage);
router.post('/testimonials', requireLogin, cms.createTestimonial);
router.get('/testimonials/:id', requireLogin, cms.getTestimonial);
router.put('/testimonials/:id', requireLogin, cms.updateTestimonial);
router.delete('/testimonials/:id', requireLogin, cms.deleteTestimonial);

// ─── Site Settings ────────────────────────────────────────────────────────────
router.get('/site-settings', requireLogin, cms.getSiteSettingsPage);
router.post('/site-settings', requireLogin, cms.saveSiteSettings);

module.exports = router;
