/**
 * src/models/Category.model.js
 * English Category management model
 */
const db = require('../../config/database');
const { slugify, generateId } = require('../utils/helpers');

class CategoryModel {
  static findAll(group = null) {
    const categories = db.getState().categories || [];
    if (!group || group === 'ALL') return categories;
    return categories.filter((c) => (c.group || '').toLowerCase() === String(group).toLowerCase());
  }

  static create(payload) {
    const state = db.getState();
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Category English name is required');

    const exists = state.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return exists;

    const newCat = {
      id: generateId('cat'),
      name,
      slug: slugify(name),
      group: payload.group || 'Popular',
      badge: payload.badge || 'NEW',
      icon: payload.icon || 'flame',
      featured: Boolean(payload.featured !== false),
      count: parseInt(payload.count || '1', 10)
    };

    state.categories.unshift(newCat);
    db.save();
    return newCat;
  }

  static delete(id) {
    const state = db.getState();
    const idx = state.categories.findIndex((c) => c.id === id || c.slug === id);
    if (idx === -1) return false;
    state.categories.splice(idx, 1);
    db.save();
    return true;
  }
}

module.exports = CategoryModel;
