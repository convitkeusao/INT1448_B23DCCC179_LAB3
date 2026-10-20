const chargeRepository = require('../repositories/charge.repository');

const MAX_CHARGE_AMOUNT = 20_000_000;

function validate(reference, amount) {
  if (typeof reference !== 'string' || reference.trim() === '') {
    return { status: 400, error: 'reference là bắt buộc.' };
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { status: 400, error: 'amount phải là số nguyên dương.' };
  }
  if (amount > MAX_CHARGE_AMOUNT) {
    return { status: 402, error: 'Số tiền vượt hạn mức 20.000.000đ.' };
  }
  return null;
}

function charge(reference, amount, idempotencyKey) {
  return chargeRepository.create(reference, amount, idempotencyKey);
}

module.exports = { validate, charge };