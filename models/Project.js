const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String },
        content: { type: String },
        coverImage: { type: String },
        techStack: [{ type: String }],
        githubUrl: { type: String },
        liveUrl: { type: String },
        featured: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },
        publishedAt: { type: Date },
        order: { type: Number, default: 0 },
        tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
        categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
        seoTitle: { type: String },
        seoDescription: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Project', ProjectSchema);
