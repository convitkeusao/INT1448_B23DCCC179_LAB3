const statsService = require('../services/stats.service');

function getStats(req, res) {
  return res.status(200).json(statsService.getStats());
}

module.exports = { getStats };