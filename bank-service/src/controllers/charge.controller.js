const chargeService = require('../services/charge.service');
const faultSimulator = require('../utils/fault-simulator');

async function createCharge(req, res, next) {
  const { reference, amount } = req.body || {};
  const validationError = chargeService.validate(reference, amount);
  if (validationError) {
    return res.status(validationError.status).json({ error: validationError.error });
  }

  try {
    const simulatedFailure = await faultSimulator.beforeCharge();
    if (simulatedFailure) {
      return res.status(500).json({ error: simulatedFailure.error });
    }

    const result = chargeService.charge(reference, amount, req.idempotencyKey);
    if (result.conflict) {
      return res.status(409).json({ error: 'Giao dịch đã tồn tại với dữ liệu khác.' });
    }
    if (faultSimulator.shouldDropResponse()) {
      return req.socket.destroy();
    }

    return res.status(201).json({
      chargeId: result.charge.chargeId,
      reference: result.charge.reference,
      amount: result.charge.amount
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createCharge };