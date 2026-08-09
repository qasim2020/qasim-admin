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

/**
 * Send many individually-addressed emails via Resend's batch API.
 * Automatically chunks into groups of 100 (Resend's per-call limit).
 * @param {Array<{to:string|string[], subject:string, html:string, text?:string}>} messages
 * @returns {Promise<{sent:number, failed:number}>}
 */
async function sendBatch(messages) {
    const client = getClient();
    const from = process.env.RESEND_FROM_EMAIL;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < messages.length; i += 100) {
        const chunk = messages.slice(i, i + 100).map((m) => ({
            from,
            to: Array.isArray(m.to) ? m.to : [m.to],
            subject: m.subject,
            html: m.html,
            ...(m.text ? { text: m.text } : {}),
        }));

        try {
            const { error } = await client.batch.send(chunk);
            if (error) {
                failed += chunk.length;
                console.warn(`Resend batch error: ${error.message}`);
            } else {
                sent += chunk.length;
            }
        } catch (err) {
            failed += chunk.length;
            console.warn(`Resend batch threw: ${err.message}`);
        }
    }

    return { sent, failed };
}

module.exports = { getClient, sendEmail, sendBatch };
