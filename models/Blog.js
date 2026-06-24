const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        excerpt: { type: String },
        content: { type: String },
        coverImage: { type: String },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },
        publishedAt: { type: Date },
        featured: { type: Boolean, default: false },
        readTimeMinutes: { type: Number },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
        categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
        seoTitle: { type: String },
        seoDescription: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Blog', BlogSchema);
