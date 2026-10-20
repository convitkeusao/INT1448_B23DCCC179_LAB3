const express = require('express');
const feeController = require('../controllers/fee.controller');

const router = express.Router();

router.get('/students/:id/fees', feeController.getFees);
router.post('/students/:id/payments', feeController.createPayment);

module.exports = router;