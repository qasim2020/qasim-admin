const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        category: {
            type: String,
            enum: ['frontend', 'backend', 'devops', 'database', 'design', 'other'],
            default: 'other',
        },
        proficiency: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            default: 'intermediate',
        },
        icon: { type: String },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Skill', SkillSchema);
