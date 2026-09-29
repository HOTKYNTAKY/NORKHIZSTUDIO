/**
 * src/utils/seed-runner.js
 * CLI script to re-seed or reset the database with all English categories & initial catalog
 */
const db = require('../../config/database');

console.log('[Seed] Resetting database to initial seed state...');
db.seedDefault();
console.log(`[Seed] Success! Seeded ${db.getState().categories.length} English categories, ${db.getState().performers.length} verified stars, and ${db.getState().videos.length} VOD streams.`);
