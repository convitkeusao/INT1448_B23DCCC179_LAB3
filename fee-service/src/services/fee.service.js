const feeRepository = require('../repositories/fee.repository');

function getStudentFees(studentId) {
  const amountDue = feeRepository.getFee(studentId);
  if (amountDue === null) {
    return null;
  }

  return { studentId: String(studentId), amountDue };
}

function reservePayment(studentId, amount) {
  const amountDue = feeRepository.getFee(studentId);
  if (amountDue === null) {
    return { valid: false, error: 'Không tìm thấy sinh viên.' };
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { valid: false, error: 'Số tiền phải là số nguyên dương.' };
  }
  if (!feeRepository.reserveFee(studentId, amount)) {
    return { valid: false, error: 'Số tiền thanh toán vượt công nợ.' };
  }

  return { valid: true, amountDue };
}

function releaseReservation(studentId, amount) {
  feeRepository.releaseFeeReservation(studentId, amount);
}

function reduceFee(studentId, amount) {
  return feeRepository.reduceFee(studentId, amount);
}

module.exports = { getStudentFees, reservePayment, releaseReservation, reduceFee };