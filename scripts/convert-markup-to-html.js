/**
 * convert-markup-to-html.js
 *
 * Converts every blog's custom line-based markup into proper HTML and saves
 * the result back into the `content` field (in-place). Blogs whose content is
 * already HTML are skipped unless FORCE=1 is set.
 *
 * Markup format (one line per element):
 *   h1: Title
 *   h2: Sub-heading
 *   p: Paragraph text
 *   p.note: Info/callout
 *   p.bold: Bold paragraph
 *   p.quote: Blockquote paragraph
 *   p.code: Inline code block
 *   p.b-left: Left-border emphasis
 *   p.caption: Caption / small text
 *   p.bg-light: Light-background paragraph
 *   img: filename.jpg  OR  https://full-url
 *   img.width-half: …
 *   img.width-m-75: …
 *   quote: Block quote
 *   verses: Quran verse reference / poetry
 *   youtube: <iframe …>   (already HTML)
 *   iframe: https://youtube-embed-url
 *   bullet: List item text
 *   table: <tr>…</tr>   (already HTML table rows)
 *   code.code: Code snippet
 *   dropdownH: N+ <summary HTML>
 *   dropdownF: N+ <body HTML>
 *
 * Run:
 *   node scripts/convert-markup-to-html.js
 *   DRY_RUN=1  node scripts/convert-markup-to-html.js
 *   FORCE=1    node scripts/convert-markup-to-html.js   # re-convert all
 *
 * Set BLOG_IMAGE_BASE_URL in .env if images are served from a remote origin,
 * e.g.  BLOG_IMAGE_BASE_URL=https://img.qasim.no/blogs/
 */

require('dotenv').config();
const mongoose    = require('mongoose');
const Blog        = require('../models/Blog');
const markupToHtml = require('../modules/markupToHtml');

const DB_URL      = process.env.DATABASE_URL      || 'mongodb://localhost:27017/qasim';
const IMAGE_BASE  = process.env.BLOG_IMAGE_BASE_URL || '';
const DRY_RUN     = process.env.DRY_RUN === '1';
const FORCE       = process.env.FORCE   === '1';

// ── main ──────────────────────────────────────────────────────────────────────
async function run() {
    await mongoose.connect(DB_URL);
    console.log(`Connected → ${DB_URL}`);
    console.log(DRY_RUN ? '[DRY RUN]' : FORCE ? '[FORCE – reconverting all]' : '[Normal – only raw-markup blogs]');
    if (IMAGE_BASE) console.log(`Image base URL: ${IMAGE_BASE}`);

    const blogs = await Blog.find({ content: { $exists: true, $ne: '' } }, '_id title content').lean();
    console.log(`\nBlogs found: ${blogs.length}\n`);

    let ok = 0, skipped = 0, errors = 0;

    for (const blog of blogs) {
        try {
            const isHtml = /<\/(p|h[1-6]|div|ul|blockquote|pre|table)>/i.test(blog.content || '');
            if (isHtml && !FORCE) {
                skipped++;
                continue;
            }
            const html = markupToHtml(blog.content);
            console.log(`  [${DRY_RUN ? 'DRY' : 'OK'}]  ${blog._id}  "${(blog.title || '').slice(0, 60)}"`);
            if (!DRY_RUN) {
                await Blog.updateOne({ _id: blog._id }, { $set: { content: html } });
            }
            ok++;
        } catch (err) {
            console.error(`  [ERR]  ${blog._id}  ${err.message}`);
            errors++;
        }
    }

    console.log(`\nDone.  converted=${ok}  skipped=${skipped}  errors=${errors}`);
    await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
