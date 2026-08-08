#!/usr/bin/env node
/**
 * Migration: CMS.life-subscribers  →  qasim.subscribers
 *
 * Usage:
 *   node scripts/migrate-life-subscribers.js            # live run
 *   node scripts/migrate-life-subscribers.js --dry-run  # preview without writing
 *
 * Field mapping:
 *   email          → email (unique key for upsert)
 *   isUnsubscribed → status: 'unsubscribed' | 'active'
 *   created_at     → subscribedAt + createdAt
 *   updatedAt      → updatedAt
 *   (new)          → source: 'life-cms'
 *   (new)          → unsubscribeToken: crypto.randomUUID()
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('\n⚠️  DRY RUN — no data will be written.\n');

const TARGET_URI = process.env.DATABASE_URL;
if (!TARGET_URI) { console.error('DATABASE_URL not set in .env'); process.exit(1); }

function deriveUri(base, dbName) {
    const url = new URL(base);
    url.pathname = '/' + dbName;
    return url.toString();
}

async function main() {
    const sourceConn = await mongoose.createConnection(deriveUri(TARGET_URI, 'CMS')).asPromise();
    const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();

    const Subscriber = targetConn.model('Subscriber', require('../models/Subscriber').schema);
    const sourceDocs = await sourceConn.db.collection('life-subscribers').find({}).sort({ created_at: 1 }).toArray();

    console.log(`Found ${sourceDocs.length} life-subscribers in CMS.\n`);

    let inserted = 0, updated = 0, skipped = 0, errored = 0;

    for (const doc of sourceDocs) {
        const email = (doc.email || '').trim().toLowerCase();
        if (!email) { console.log(`  [SKIP] no email on _id ${doc._id}`); skipped++; continue; }

        const isUnsubscribed = String(doc.isUnsubscribed).toLowerCase() === 'true';
        const status         = isUnsubscribed ? 'unsubscribed' : 'active';
        const subscribedAt   = doc.created_at ? new Date(doc.created_at) : new Date();

        console.log(`  [${status.toUpperCase()}] ${email}`);
        if (DRY_RUN) { skipped++; continue; }

        try {
            const existing = await Subscriber.findOne({ email });
            if (existing) {
                // Only update status if it changed; don't overwrite token or dates
                await Subscriber.updateOne({ email }, { $set: { status } });
                updated++;
            } else {
                await Subscriber.create({
                    email,
                    status,
                    subscribedAt,
                    source: 'life-cms',
                    unsubscribeToken: crypto.randomUUID(),
                    createdAt: subscribedAt,
                    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : subscribedAt,
                });
                inserted++;
            }
        } catch (err) {
            console.error(`  [ERROR] ${email}: ${err.message}`);
            errored++;
        }
    }

    await sourceConn.close();
    await targetConn.close();

    console.log('\n─────────────────────────────────────');
    if (DRY_RUN) {
        console.log(`DRY RUN complete. Would process ${sourceDocs.length} subscribers.`);
    } else {
        console.log(`Done. Inserted: ${inserted}  Updated: ${updated}  Skipped: ${skipped}  Errors: ${errored}`);
    }
}

main().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
