const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema(
    {
        fullName: { type: String },
        tagline: { type: String },
        bio: { type: String },
        profilePhoto: { type: String },
        resumeUrl: { type: String },
        contactEmail: { type: String },
        githubUrl: { type: String },
        linkedinUrl: { type: String },
        twitterUrl: { type: String },
        youtubeUrl: { type: String },
        instagramUrl: { type: String },
    },
    { timestamps: true }
);

// Enforce singleton — only one document allowed
SiteSettingsSchema.pre('save', async function (next) {
    if (this.isNew) {
        const count = await mongoose.model('SiteSettings').countDocuments();
        if (count > 0) {
            return next(new Error('Only one SiteSettings document is allowed.'));
        }
    }
    next();
});

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);
