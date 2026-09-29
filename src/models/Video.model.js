/**
 * src/models/Video.model.js
 * Video domain model with filtering, sorting, search, and validation
 */
const db = require('../../config/database');
const { slugify, generateId } = require('../utils/helpers');
const { createLuxuryPosterSvg, SAMPLE_STREAMS } = require('../../config/categories.seed');

class VideoModel {
  static findAll(filters = {}) {
    const state = db.getState();
    let list = [...state.videos];

    // Filter by English category name or slug
    if (filters.category && filters.category !== 'ALL') {
      const catQuery = String(filters.category).toLowerCase();
      list = list.filter((v) =>
        (v.categories || []).some(
          (c) => c.toLowerCase() === catQuery || slugify(c) === catQuery
        )
      );
    }

    // Filter by Performer
    if (filters.performer) {
      const perfQuery = String(filters.performer).toLowerCase();
      list = list.filter(
        (v) => (v.performer || '').toLowerCase() === perfQuery || slugify(v.performer) === perfQuery
      );
    }

    // Filter by Quality (e.g., 4K UHD)
    if (filters.quality) {
      const q = String(filters.quality).toLowerCase();
      list = list.filter((v) => (v.quality || '').toLowerCase().includes(q));
    }

    // Filter by VIP only
    if (filters.vip === 'true' || filters.vip === true) {
      list = list.filter((v) => v.isVip === true);
    }

    // Search query across title, description, categories, tags, performer
    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      list = list.filter((v) => {
        const hay = [
          v.title,
          v.description,
          v.performer,
          ...(v.categories || []),
          ...(v.tags || [])
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    // Sorting
    const sort = filters.sort || 'latest';
    if (sort === 'views' || sort === 'popular') {
      list.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'rating' || sort === 'top') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'likes') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return list;
  }

  static findById(id) {
    return db.getState().videos.find((v) => v.id === id || v.slug === id) || null;
  }

  static create(payload) {
    const state = db.getState();
    const title = String(payload.title || 'Untitled Exclusive Scene').trim();
    const performer = String(payload.performer || 'Verified Studio Star').trim();
    const quality = payload.quality || '4K UHD';
    const categories = Array.isArray(payload.categories)
      ? payload.categories
      : String(payload.categories || '4K Ultra HD, Exclusive VIP')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    const tags = Array.isArray(payload.tags)
      ? payload.tags
      : String(payload.tags || '4K, Exclusive, HD')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    const defaultPoster = createLuxuryPosterSvg(
      title.slice(0, 26).toUpperCase(),
      `${performer.toUpperCase()} • ${quality}`,
      payload.isVip ? 'VIP 4K' : quality,
      '#3b0764',
      '#4c0519',
      '#e11d48'
    );

    const newVideo = {
      id: generateId('vid'),
      title,
      slug: slugify(title),
      description:
        payload.description ||
        `Exclusive licensed adult production featuring ${performer} in ${quality}.`,
      duration: payload.duration || '35:00',
      quality,
      fps: payload.fps || '60FPS',
      views: parseInt(payload.views || '1200', 10),
      likes: parseInt(payload.likes || '185', 10),
      rating: parseInt(payload.rating || '98', 10),
      isVip: Boolean(payload.isVip),
      isFeatured: Boolean(payload.isFeatured),
      performer,
      categories: categories.length ? categories : ['4K Ultra HD'],
      tags,
      streamUrl: payload.streamUrl || SAMPLE_STREAMS[0],
      thumbnail: payload.thumbnail || defaultPoster,
      createdAt: new Date().toISOString()
    };

    state.videos.unshift(newVideo);

    // Increment category counts
    newVideo.categories.forEach((catName) => {
      const foundCat = state.categories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase()
      );
      if (foundCat) {
        foundCat.count = (foundCat.count || 0) + 1;
      }
    });

    db.save();
    return newVideo;
  }

  static update(id, payload) {
    const state = db.getState();
    const idx = state.videos.findIndex((v) => v.id === id);
    if (idx === -1) return null;

    const current = state.videos[idx];
    const updated = {
      ...current,
      title: payload.title !== undefined ? String(payload.title).trim() : current.title,
      description:
        payload.description !== undefined ? String(payload.description).trim() : current.description,
      duration: payload.duration !== undefined ? payload.duration : current.duration,
      quality: payload.quality !== undefined ? payload.quality : current.quality,
      fps: payload.fps !== undefined ? payload.fps : current.fps,
      performer: payload.performer !== undefined ? payload.performer : current.performer,
      isVip: payload.isVip !== undefined ? Boolean(payload.isVip) : current.isVip,
      isFeatured: payload.isFeatured !== undefined ? Boolean(payload.isFeatured) : current.isFeatured,
      streamUrl: payload.streamUrl || current.streamUrl,
      thumbnail: payload.thumbnail || current.thumbnail,
      categories:
        payload.categories !== undefined
          ? Array.isArray(payload.categories)
            ? payload.categories
            : String(payload.categories)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
          : current.categories,
      tags:
        payload.tags !== undefined
          ? Array.isArray(payload.tags)
            ? payload.tags
            : String(payload.tags)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
          : current.tags
    };

    state.videos[idx] = updated;
    db.save();
    return updated;
  }

  static delete(id) {
    const state = db.getState();
    const idx = state.videos.findIndex((v) => v.id === id);
    if (idx === -1) return false;
    state.videos.splice(idx, 1);
    db.save();
    return true;
  }

  static incrementView(id) {
    const state = db.getState();
    const vid = state.videos.find((v) => v.id === id);
    if (!vid) return null;
    vid.views = (vid.views || 0) + 1;
    state.analytics.totalViews = (state.analytics.totalViews || 0) + 1;
    db.save();
    return vid;
  }

  static toggleLike(id) {
    const state = db.getState();
    const vid = state.videos.find((v) => v.id === id);
    if (!vid) return null;
    vid.likes = (vid.likes || 0) + 1;
    db.save();
    return vid;
  }
}

module.exports = VideoModel;
