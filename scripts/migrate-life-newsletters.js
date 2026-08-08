#!/usr/bin/env node
/**
 * Migration: CMS.life-newsletters  →  qasim.newsletters
 *
 * Usage:
 *   node scripts/migrate-life-newsletters.js            # live run
 *   node scripts/migrate-life-newsletters.js --dry-run  # preview without writing
 *
 * Field mapping:
 *   subject        → subject + title (title = subject)
 *   body           → content (raw markup) + bodyHtml (converted HTML)
 *   publishTime    → sentAt; status = 'sent'
 *   (no publishTime) → status = 'draft'
 *   created_at     → createdAt
 *   updatedAt      → updatedAt
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const markupToHtml = require('../modules/markupToHtml');

// ─── CLI flags ────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('\n⚠️  DRY RUN — no data will be written.\n');

// ─── DB URIs ──────────────────────────────────────────────────────────────────
const TARGET_URI = process.env.DATABASE_URL;
if (!TARGET_URI) { console.error('DATABASE_URL not set in .env'); process.exit(1); }

function deriveUri(base, dbName) {
    const url = new URL(base);
    url.pathname = '/' + dbName;
    return url.toString();
}
const SOURCE_URI = deriveUri(TARGET_URI, 'CMS');

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    // Two separate connections
    const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
    const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();

    const Newsletter = targetConn.model('Newsletter', require('../models/Newsletter').schema);
    const sourceCol  = sourceConn.db.collection('life-newsletters');

    const sourceDocs = await sourceCol.find({}).sort({ publishTime: 1 }).toArray();
    console.log(`Found ${sourceDocs.length} life-newsletters in CMS.\n`);

    let inserted = 0, updated = 0, skipped = 0;

    for (const doc of sourceDocs) {
        const subject  = (doc.subject || '').trim();
        const title    = subject || 'Untitled Newsletter';
        const content  = doc.body || '';
        const bodyHtml = markupToHtml(content);
        const status   = doc.publishTime ? 'sent' : 'draft';
        const sentAt   = doc.publishTime ? new Date(doc.publishTime) : undefined;

        const payload = {
            title,
            subject,
            content,
            bodyHtml,
            status,
            ...(sentAt && { sentAt }),
        };

        console.log(`  [${status.toUpperCase()}] "${title}" (slug: ${doc.slug || 'n/a'})`);
        if (DRY_RUN) { skipped++; continue; }

        // Upsert by slug stored in a meta field, or match on subject + sentAt to avoid duplicates
        const filter = sentAt
            ? { subject, sentAt }
            : { subject };

        const result = await Newsletter.updateOne(
            filter,
            {
                $set: payload,
                $setOnInsert: {
                    createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
                },
            },
            { upsert: true }
        );

        if (result.upsertedCount) inserted++;
        else if (result.modifiedCount) updated++;
        else skipped++;
    }

    await sourceConn.close();
    await targetConn.close();

    console.log('\n─────────────────────────────────────');
    if (DRY_RUN) {
        console.log(`DRY RUN complete. Would process ${sourceDocs.length} newsletters.`);
    } else {
        console.log(`Done. Inserted: ${inserted}  Updated: ${updated}  Unchanged: ${skipped}`);
    }
}

main().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
