const mongoose = require('mongoose');

const NewsletterSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        subject: { type: String, required: true },
        previewText: { type: String },
        content: { type: String },
        bodyHtml: { type: String },
        status: {
            type: String,
            enum: ['draft', 'sent'],
            default: 'draft',
        },
        sentAt: { type: Date },
        recipientCount: { type: Number },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Newsletter', NewsletterSchema);
