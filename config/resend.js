const { Resend } = require('resend');

let _resend = null;

function getClient() {
    if (!_resend) {
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
}

/**
 * Send an email via Resend.
 * @param {object} options
 * @param {string|string[]} options.to      - Recipient address(es)
 * @param {string}          options.subject - Email subject line
 * @param {string}          options.html    - HTML body
 * @param {string}          [options.text]  - Optional plain-text fallback
 * @returns {Promise<object>} Resend API response
 */
async function sendEmail({ to, subject, html, text }) {
    const client = getClient();
    const { data, error } = await client.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(text ? { text } : {}),
    });

    if (error) {
        throw new Error(`Resend error: ${error.message}`);
    }

    return data;
}

module.exports = { getClient, sendEmail };
