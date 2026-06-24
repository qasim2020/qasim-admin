const mongoose = require('mongoose');

const TestimonialSchema = new mongoose.Schema(
    {
        author: { type: String, required: true },
        role: { type: String },
        company: { type: String },
        content: { type: String, required: true },
        avatar: { type: String },
        featured: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Testimonial', TestimonialSchema);
