const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = {
  port: positiveInteger(process.env.PORT, 4001),
  bankUrl: process.env.BANK_URL || 'http://localhost:4002',
  bankTimeoutMs: positiveInteger(process.env.BANK_TIMEOUT_MS, 4000),
  bankMaxRetries: positiveInteger(process.env.BANK_MAX_RETRIES, 5)
};