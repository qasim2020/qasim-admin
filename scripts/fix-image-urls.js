/**
 * Prefix all relative <img src="filename.jpg"> in blog content
 * with the Cloudinary base URL.
 */
const mongoose = require('mongoose');
const Blog = require('../models/Blog');

const BASE = 'https://res.cloudinary.com/miscellaneous/image/upload/v1592022711/qurandaily/';
// Matches <img src="anything-not-starting-with-http-or-slash">
const RE = /<img([^>]*?) src="(?!https?:\/\/)(?!\/)([^"]+)"/g;

mongoose.connect('mongodb://localhost:27017/qasim').then(async () => {
    const docs = await Blog.find(
        { content: { $regex: '<img' } },
        { content: 1 }
    ).lean();

    console.log(`Checking ${docs.length} blogs with images…`);
    let fixed = 0;

    for (const doc of docs) {
        const newContent = doc.content.replace(RE, (match, attrs, filename) => {
            return `<img${attrs} src="${BASE}${filename}"`;
        });
        if (newContent !== doc.content) {
            await Blog.updateOne({ _id: doc._id }, { $set: { content: newContent } });
            fixed++;
        }
    }

    console.log(`Done. fixed=${fixed}`);
    mongoose.disconnect();
}).catch(err => { console.error(err); process.exit(1); });
