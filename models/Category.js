const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String },
        type: {
            type: String,
            enum: ['blog', 'project', 'both'],
            default: 'both',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Category', CategorySchema);
