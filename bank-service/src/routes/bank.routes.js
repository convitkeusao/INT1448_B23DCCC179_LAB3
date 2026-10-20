const express = require('express');
const chargeController = require('../controllers/charge.controller');
const statsController = require('../controllers/stats.controller');
const idempotencyMiddleware = require('../middleware/idempotency.middleware');
const statsService = require('../services/stats.service');

const router = express.Router();

router.get('/stats', statsController.getStats);
router.post('/charges', (req, res, next) => {
  statsService.recordRequest();
  next();
}, idempotencyMiddleware, (req, res, next) => {
  chargeController.createCharge(req, res, next);
});

module.exports = router;