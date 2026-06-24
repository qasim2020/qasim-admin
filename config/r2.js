const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

/**
 * Upload a file to R2.
 * @param {string} key       - Object key (path within the bucket), e.g. "images/photo.jpg"
 * @param {Buffer} buffer    - File contents
 * @param {string} contentType - MIME type, e.g. "image/jpeg"
 */
async function uploadToR2(key, buffer, contentType) {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });
    await r2Client.send(command);
    return getPublicUrl(key);
}

/**
 * Delete an object from R2.
 * @param {string} key - Object key to delete
 */
async function deleteFromR2(key) {
    const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
    await r2Client.send(command);
}

/**
 * Return the public URL for a stored object.
 * @param {string} key - Object key
 * @returns {string}
 */
function getPublicUrl(key) {
    return `${PUBLIC_URL}/${key}`;
}

/**
 * Generate a short-lived pre-signed GET URL (useful for private buckets).
 * @param {string} key         - Object key
 * @param {number} expiresIn   - Seconds until expiry (default 3600)
 * @returns {Promise<string>}
 */
async function getPresignedUrl(key, expiresIn = 3600) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(r2Client, command, { expiresIn });
}

module.exports = { r2Client, uploadToR2, deleteFromR2, getPublicUrl, getPresignedUrl };
