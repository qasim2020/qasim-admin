const mongoose = require('mongoose');

const WorkExperienceSchema = new mongoose.Schema(
    {
        company: { type: String, required: true },
        role: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        current: { type: Boolean, default: false },
        description: { type: String },
        companyUrl: { type: String },
        companyLogo: { type: String },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('WorkExperience', WorkExperienceSchema);
