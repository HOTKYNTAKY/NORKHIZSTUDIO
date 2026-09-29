/**
 * src/controllers/category.controller.js
 * Public API controller for English categories & verified performers
 */
const CategoryModel = require('../models/Category.model');
const PerformerModel = require('../models/Performer.model');
const { sendJson } = require('../utils/helpers');

class CategoryController {
  static listCategories(req, res, queryParams) {
    const group = queryParams.get('group') || null;
    const categories = CategoryModel.findAll(group);
    return sendJson(res, 200, {
      success: true,
      total: categories.length,
      categories
    });
  }

  static listPerformers(req, res) {
    const performers = PerformerModel.findAll();
    return sendJson(res, 200, {
      success: true,
      total: performers.length,
      performers
    });
  }
}

module.exports = CategoryController;
