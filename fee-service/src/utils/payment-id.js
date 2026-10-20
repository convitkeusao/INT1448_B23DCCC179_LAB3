let nextPaymentId = 1;

function createPaymentId() {
  return `P${nextPaymentId++}`;
}

module.exports = { createPaymentId };