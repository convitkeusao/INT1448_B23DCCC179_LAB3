const feeService = require('../services/fee.service');
const paymentService = require('../services/payment.service');

function getFees(req, res) {
  const fees = feeService.getStudentFees(req.params.id);
  if (!fees) {
    return res.status(404).json({ error: 'Không tìm thấy sinh viên.' });
  }

  return res.status(200).json(fees);
}

async function createPayment(req, res, next) {
  try {
    const result = await paymentService.createPayment(req.params.id, req.body?.amount);
    if (result.kind === 'invalid') {
      return res.status(400).json({ error: result.error });
    }
    if (result.status === 'PAID') {
      return res.status(201).json(result);
    }

    return res.status(result.httpStatus).json({
      error: result.error,
      paymentId: result.paymentId,
      status: result.status
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getFees, createPayment };