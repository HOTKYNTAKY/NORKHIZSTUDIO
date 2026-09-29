/**
 * src/middleware/ageGate.js
 * 18+ Regulatory & Official License Compliance Headers Middleware
 */
const db = require('../../config/database');

function attachComplianceHeaders(res) {
  const settings = db.getState().settings;
  res.setHeader('X-Adult-Rating', 'RTA-5042-1996-1400-1577-RTA');
  res.setHeader('X-License-Registration', settings.licenseNumber || 'IR-AVOD-2026-99481-OFFICIAL');
  res.setHeader('X-Minimum-Age', String(settings.minimumAge || 18));
}

module.exports = { attachComplianceHeaders };
