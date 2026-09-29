/**
 * src/models/Performer.model.js
 * Verified Performers & Studio Stars Directory Model
 */
const db = require('../../config/database');
const { generateId } = require('../utils/helpers');

class PerformerModel {
  static findAll() {
    return db.getState().performers || [];
  }

  static create(payload) {
    const state = db.getState();
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Performer name is required');

    const palettes = [
      ['#e11d48', '#7f1d1d'],
      ['#9333ea', '#3b0764'],
      ['#f59e0b', '#78350f'],
      ['#ec4899', '#831843'],
      ['#06b6d4', '#164e63']
    ];

    const newPerformer = {
      id: generateId('perf'),
      name,
      country: payload.country || 'International',
      rank: state.performers.length + 1,
      videosCount: parseInt(payload.videosCount || '12', 10),
      views: payload.views || '1.2M',
      rating: parseInt(payload.rating || '97', 10),
      verified: true,
      badge: payload.badge || 'VERIFIED STAR',
      palette: palettes[state.performers.length % palettes.length]
    };

    state.performers.push(newPerformer);
    db.save();
    return newPerformer;
  }

  static delete(id) {
    const state = db.getState();
    const idx = state.performers.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    state.performers.splice(idx, 1);
    db.save();
    return true;
  }
}

module.exports = PerformerModel;
