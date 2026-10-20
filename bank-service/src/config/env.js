const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function nonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function probability(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

module.exports = {
  port: nonNegativeInteger(process.env.PORT, 4002) || 4002,
  delayMs: nonNegativeInteger(process.env.DELAY_MS, 0),
  failRate: probability(process.env.FAIL_RATE, 0),
  dropRate: probability(process.env.DROP_RATE, 0)
};