/**
 * scripts/migrate-tags-from-cms.js
 *
 * Reads comma-separated tag strings from CMS.life-blogs,
 * matches each blog to qasim.blogs by the serial number at the end of the slug
 * (e.g. "settle-your-storm-1070" → ser "1070"),
 * upserts Tag documents in qasim.tags (case-insensitive dedup),
 * and updates qasim.blogs.tags with correct ObjectIds.
 */

const mongoose = require('mongoose');

const QASIM_URL = 'mongodb://localhost:27017/qasim';
const CMS_URL   = 'mongodb://localhost:27017/CMS';

async function run() {
    const qasimConn = await mongoose.createConnection(QASIM_URL).asPromise();
    const cmsConn   = await mongoose.createConnection(CMS_URL).asPromise();

    const blogsCol     = qasimConn.db.collection('blogs');
    const tagsCol      = qasimConn.db.collection('tags');
    const lifeBlogsCol = cmsConn.db.collection('life-blogs');

    // Build a map: ser → life-blog doc (only docs with non-empty string tags)
    const lifeBlogsBySer = new Map();
    const lifeCursor = lifeBlogsCol.find({ tags: { $type: 'string' } }, { projection: { ser: 1, tags: 1 } });
    for await (const lb of lifeCursor) {
        if (lb.ser) lifeBlogsBySer.set(String(lb.ser), lb);
    }
    console.log(`Loaded ${lifeBlogsBySer.size} CMS life-blogs with string tags`);

    // Cache: tag name (lowercase) → ObjectId in qasim.tags
    const tagCache = new Map();
    let tagsCreated = 0;

    async function getOrCreateTag(rawName) {
        const name = rawName.trim();
        const key  = name.toLowerCase();
        if (tagCache.has(key)) return tagCache.get(key);

        // Escape special regex chars
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let tagDoc = await tagsCol.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } });
        if (!tagDoc) {
            const result = await tagsCol.insertOne({ name, createdAt: new Date(), updatedAt: new Date() });
            tagDoc = { _id: result.insertedId };
            tagsCreated++;
        }
        tagCache.set(key, tagDoc._id);
        return tagDoc._id;
    }

    let updated = 0, skipped = 0;

    const qasimCursor = blogsCol.find({}, { projection: { slug: 1 } });
    for await (const blog of qasimCursor) {
        // Extract trailing number from slug as the ser
        const m = blog.slug && blog.slug.match(/-(\d+)$/);
        if (!m) { skipped++; continue; }
        const ser = m[1];

        const lb = lifeBlogsBySer.get(ser);
        if (!lb) { skipped++; continue; }

        const tagNames = lb.tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        if (!tagNames.length) { skipped++; continue; }

        const tagIds = await Promise.all(tagNames.map(getOrCreateTag));

        await blogsCol.updateOne({ _id: blog._id }, { $set: { tags: tagIds } });
        updated++;
    }

    console.log(`Done. updated=${updated}  skipped=${skipped}  tagsCreated=${tagsCreated}`);

    await qasimConn.close();
    await cmsConn.close();
}

run().catch(err => { console.error(err); process.exit(1); });
