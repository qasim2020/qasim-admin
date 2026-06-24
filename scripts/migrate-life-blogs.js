#!/usr/bin/env node
/**
 * Migration: CMS.life-blogs  →  qasim.blogs
 *
 * Usage:
 *   node scripts/migrate-life-blogs.js            # live run
 *   node scripts/migrate-life-blogs.js --dry-run  # preview without writing
 *
 * What it does:
 *   1. Reads all 309 documents from CMS.life-blogs
 *   2. Extracts the title from the first "h1:" line in `body`
 *   3. Builds a proper slug: <title-slug>-<ser>  (guaranteed unique)
 *   4. Splits the comma-separated `tags` field → upserts Tag documents
 *   5. Maps `type` → upserts a Category document (normalises case variants)
 *   6. Appends `verses` field to the end of content
 *   7. Upserts each Blog document by slug (safe to re-run)
 *   8. Preserves original _id, created_at, date, updatedAt
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// ─── CLI flags ────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('\n⚠️  DRY RUN — no data will be written.\n');

// ─── DB URIs ──────────────────────────────────────────────────────────────────
const TARGET_URI = process.env.DATABASE_URL; // qasim
if (!TARGET_URI) {
    console.error('DATABASE_URL not set in .env');
    process.exit(1);
}
function deriveUri(base, dbName) {
    const url = new URL(base);
    url.pathname = '/' + dbName;
    return url.toString();
}
const SOURCE_URI = deriveUri(TARGET_URI, 'CMS');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(str) {
    return (str || '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Pull the first h1: line from body as the post title */
function extractTitle(body) {
    if (!body) return 'Untitled';
    const match = body.match(/^h1:\s*(.+)/im);
    if (match) return match[1].trim();
    // Fallback: first non-empty line, stripped of any "tag:" prefix
    const firstLine = (body.split('\n').find(l => l.trim()) || '').trim();
    return firstLine.replace(/^\w[\w.]*:\s*/, '') || 'Untitled';
}

/** Split comma-separated tags string */
function parseTags(tagsStr) {
    if (!tagsStr || typeof tagsStr !== 'string') return [];
    return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
}

/** Normalise `type` field to a canonical display name + slug */
function normaliseType(type) {
    const map = {
        qurandaily: { name: 'Quran Daily',   slug: 'quran-daily'  },
        qurandaily2: { name: 'Quran Daily',  slug: 'quran-daily'  }, // alias
        quranclass: { name: 'Quran Class',   slug: 'quran-class'  },
        mediumblogs:{ name: 'Medium Blogs',  slug: 'medium-blogs' },
        pulse:      { name: 'Pulse',         slug: 'pulse'        },
    };
    const key = (type || '').toLowerCase().replace(/\s+/g, '');
    return map[key] || { name: type || 'Uncategorised', slug: slugify(type) || 'uncategorised' };
}

/** Whether a `publish` field value means "published" */
function isPublished(val) {
    if (!val) return false;
    const v = String(val).toLowerCase();
    return v === 'true' || v === 'publish' || v === '1';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('Connecting to databases…');

    // Two separate connections — source (CMS) and target (qasim)
    const [sourceConn, targetConn] = await Promise.all([
        mongoose.createConnection(SOURCE_URI).asPromise(),
        mongoose.createConnection(TARGET_URI).asPromise(),
    ]);
    console.log(`  Source : ${SOURCE_URI}`);
    console.log(`  Target : ${TARGET_URI}\n`);

    // Register models on the TARGET connection
    const BlogSchema     = require('../models/Blog').schema;
    const TagSchema      = require('../models/Tag').schema;
    const CategorySchema = require('../models/Category').schema;
    const UserSchema     = require('../models/User').schema;

    const BlogModel = targetConn.model('Blog',     BlogSchema);
    const TagModel  = targetConn.model('Tag',      TagSchema);
    const CatModel  = targetConn.model('Category', CategorySchema);
    const UserModel = targetConn.model('User',     UserSchema);

    // Find the admin user to use as author
    const adminUser = await UserModel.findOne({ name: /qasim ali/i })
        || await UserModel.findOne().sort({ createdAt: 1 });
    if (adminUser) {
        console.log(`Author mapped to: ${adminUser.name} (${adminUser._id})`);
    } else {
        console.log('No admin user found — author field will be empty.');
    }

    // Read all source documents
    const sourceDocs = await sourceConn.db
        .collection('life-blogs')
        .find({})
        .sort({ ser: 1 })
        .toArray();
    console.log(`\nSource documents: ${sourceDocs.length}\n`);

    // ── Caches (avoid repeat DB lookups per tag/category) ──────────────────
    const tagCache = {};   // tagName  → ObjectId
    const catCache = {};   // typeSlug → ObjectId

    // ── Stats ──────────────────────────────────────────────────────────────
    const stats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
    const errorLog = [];

    // ── Process each document ──────────────────────────────────────────────
    for (let i = 0; i < sourceDocs.length; i++) {
        const doc = sourceDocs[i];
        process.stdout.write(`\r  [${i + 1}/${sourceDocs.length}] Processing ser=${doc.ser || doc._id}  `);

        try {
            // Title & slug
            const title = extractTitle(doc.body);
            const baseSlug = slugify(title) || 'post';
            const slug = doc.ser ? `${baseSlug}-${doc.ser}` : baseSlug;

            // Tags — upsert each by name
            const tagIds = [];
            for (const tagName of parseTags(doc.tags)) {
                if (!tagCache[tagName]) {
                    if (!DRY_RUN) {
                        const tag = await TagModel.findOneAndUpdate(
                            { name: tagName },
                            { $setOnInsert: { name: tagName } },
                            { upsert: true, new: true }
                        );
                        tagCache[tagName] = tag._id;
                    } else {
                        tagCache[tagName] = new mongoose.Types.ObjectId();
                    }
                }
                tagIds.push(tagCache[tagName]);
            }

            // Category — upsert by slug
            let catId = null;
            if (doc.type && doc.type.toLowerCase() !== 'type') {
                const { name: catName, slug: catSlug } = normaliseType(doc.type);
                if (!catCache[catSlug]) {
                    if (!DRY_RUN) {
                        const cat = await CatModel.findOneAndUpdate(
                            { slug: catSlug },
                            { $setOnInsert: { name: catName, slug: catSlug, type: 'blog' } },
                            { upsert: true, new: true }
                        );
                        catCache[catSlug] = cat._id;
                    } else {
                        catCache[catSlug] = new mongoose.Types.ObjectId();
                    }
                }
                catId = catCache[catSlug];
            }

            // Content — body + verses appended
            let content = (doc.body || '').trim();
            if (doc.verses) {
                content += `\n\nverses: ${doc.verses}`;
            }

            // Status & dates
            const published = isPublished(doc.publish);
            const publishedAt = published
                ? new Date(doc.date || doc.created_at || Date.now())
                : undefined;
            const createdAt = new Date(doc.created_at || Date.now());
            const updatedAt = new Date(doc.updatedAt || doc.created_at || Date.now());

            // Preserve original _id where possible
            let originalId;
            try {
                originalId = new mongoose.Types.ObjectId(doc._id.toString());
            } catch {
                originalId = new mongoose.Types.ObjectId();
            }

            if (DRY_RUN) {
                stats.inserted++;
                continue;
            }

            // Upsert by slug — safe to re-run
            const result = await BlogModel.collection.findOneAndUpdate(
                { slug },
                {
                    $setOnInsert: {
                        _id: originalId,
                        createdAt,
                    },
                    $set: {
                        title,
                        slug,
                        content,
                        status: published ? 'published' : 'draft',
                        publishedAt,
                        author: adminUser?._id || null,
                        tags: tagIds,
                        categories: catId ? [catId] : [],
                        featured: false,
                        updatedAt,
                    },
                },
                { upsert: true, returnDocument: 'after' }
            );

            if (result && result.lastErrorObject?.updatedExisting) {
                stats.updated++;
            } else {
                stats.inserted++;
            }
        } catch (err) {
            stats.errors++;
            errorLog.push({ id: doc._id, ser: doc.ser, error: err.message });
        }
    }

    // ── Summary ────────────────────────────────────────────────────────────
    console.log('\n\n─────────────────────────────────────────');
    console.log('Migration complete!');
    console.log(`  Inserted  : ${stats.inserted}`);
    console.log(`  Updated   : ${stats.updated}`);
    console.log(`  Errors    : ${stats.errors}`);
    console.log(`  Tags      : ${Object.keys(tagCache).length} unique tags`);
    console.log(`  Categories: ${Object.keys(catCache).length} unique categories`);
    if (DRY_RUN) console.log('\n⚠️  DRY RUN — no data was written.');

    if (errorLog.length > 0) {
        console.log('\nErrors encountered:');
        errorLog.forEach(e => console.log(`  ser=${e.ser || e.id}: ${e.error}`));
    }

    await sourceConn.close();
    await targetConn.close();
    process.exit(0);
}

main().catch(err => {
    console.error('\nFatal error:', err.message);
    process.exit(1);
});
