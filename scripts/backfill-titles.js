/**
 * backfill-titles.js
 *
 * For every blog post whose title is missing or blank, extract the title
 * from the first  "h1: ..." line in `content` and save it back to the DB.
 *
 * Run once:  node scripts/backfill-titles.js
 *
 * Options (env vars):
 *   DRY_RUN=1   – print changes without writing to DB
 *   FORCE=1     – overwrite ALL titles from h1: even if title already exists
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/Blog');

const DB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/qasim';
const DRY_RUN = process.env.DRY_RUN === '1';
const FORCE   = process.env.FORCE === '1';

function extractH1(content) {
    if (!content) return null;
    const m = content.match(/^h1:\s*(.+)/im);
    if (m) return m[1].trim();
    // Fallback: first non-empty line stripped of any tag: prefix
    const first = (content.split('\n').find(l => l.trim()) || '').trim();
    const stripped = first.replace(/^[\w.]+:\s*/, '').trim();
    return stripped || null;
}

async function run() {
    await mongoose.connect(DB_URL);
    console.log(`Connected to ${DB_URL}`);
    console.log(DRY_RUN ? '[DRY RUN – no writes]' : FORCE ? '[FORCE mode – overwriting all titles]' : '[Normal mode – only filling blank titles]');

    const filter = FORCE ? {} : { $or: [{ title: { $exists: false } }, { title: '' }, { title: null }] };
    const blogs = await Blog.find(filter, 'title content').lean();

    console.log(`\nBlogs to process: ${blogs.length}`);

    let updated = 0;
    let skipped = 0;
    let noH1    = 0;

    for (const blog of blogs) {
        const newTitle = extractH1(blog.content);
        if (!newTitle) {
            console.log(`  [no h1]  ${blog._id}`);
            noH1++;
            continue;
        }
        if (!FORCE && blog.title && blog.title.trim()) {
            skipped++;
            continue;
        }
        console.log(`  [${DRY_RUN ? 'DRY' : 'UPDATE'}]  ${blog._id}  →  "${newTitle}"`);
        if (!DRY_RUN) {
            await Blog.updateOne({ _id: blog._id }, { $set: { title: newTitle } });
        }
        updated++;
    }

    console.log(`\nDone.`);
    console.log(`  Updated : ${updated}`);
    console.log(`  Skipped : ${skipped}`);
    console.log(`  No h1   : ${noH1}`);

    await mongoose.disconnect();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
