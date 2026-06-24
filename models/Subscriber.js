const mongoose = require('mongoose');
const crypto = require('crypto');

const SubscriberSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        name: { type: String },
        status: {
            type: String,
            enum: ['active', 'unsubscribed', 'bounced'],
            default: 'active',
        },
        subscribedAt: { type: Date, default: Date.now },
        unsubscribedAt: { type: Date },
        source: { type: String },
        unsubscribeToken: { type: String, unique: true },
    },
    { timestamps: true }
);

SubscriberSchema.pre('save', function (next) {
    if (!this.unsubscribeToken) {
        this.unsubscribeToken = crypto.randomUUID();
    }
    next();
});

module.exports = mongoose.model('Subscriber', SubscriberSchema);
