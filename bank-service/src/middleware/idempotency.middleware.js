const chargeRepository = require('../repositories/charge.repository');

function idempotencyMiddleware(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (!key || key.trim() === '') {
    return res.status(400).json({ error: 'Header Idempotency-Key là bắt buộc.' });
  }

  req.idempotencyKey = key;
  const { reference, amount } = req.body || {};
  if (typeof reference !== 'string' || !Number.isSafeInteger(amount) || amount <= 0) {
    return next();
  }

  const existing = chargeRepository.lookup(reference, amount, key);
  if (existing.conflict) {
    return res.status(409).json({
      error: 'Idempotency-Key hoặc reference đã được dùng cho giao dịch khác.'
    });
  }
  if (existing.charge) {
    return res.status(201).json({
      chargeId: existing.charge.chargeId,
      reference: existing.charge.reference,
      amount: existing.charge.amount
    });
  }

  return next();
}

module.exports = idempotencyMiddleware;