const feeService = require('./fee.service');
const bankClient = require('./bank-client');
const { createPaymentId } = require('../utils/payment-id');

async function createPayment(studentId, amount) {
  const validation = feeService.reservePayment(studentId, amount);
  if (!validation.valid) {
    return { kind: 'invalid', error: validation.error };
  }

  const paymentId = createPaymentId();
  let bankResult;
  try {
    bankResult = await bankClient.charge({
      reference: paymentId,
      amount,
      idempotencyKey: paymentId
    });
  } catch (error) {
    feeService.releaseReservation(studentId, amount);
    throw error;
  }

  if (bankResult.kind === 'paid') {
    const reduced = feeService.reduceFee(studentId, amount);
    if (!reduced) {
      throw new Error(`Unable to reduce fee after confirmed charge ${paymentId}`);
    }

    return {
      kind: 'paid',
      paymentId,
      status: 'PAID',
      chargeId: bankResult.chargeId,
      amount
    };
  }

  if (bankResult.status === 'FAILED') {
    feeService.releaseReservation(studentId, amount);
  }

  return {
    kind: 'failed',
    paymentId,
    status: bankResult.status,
    httpStatus: bankResult.httpStatus,
    error: bankResult.error
  };
}

module.exports = { createPayment };