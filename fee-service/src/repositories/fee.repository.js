const initialFees = {
  '1': 50_000_000,
  '2': 0,
  '3': 3_200_000
};

const fees = new Map(Object.entries(initialFees));
const reservedFees = new Map();

function getFee(studentId) {
  if (!fees.has(String(studentId))) {
    return null;
  }

  return fees.get(String(studentId));
}

function reserveFee(studentId, amount) {
  const key = String(studentId);
  const currentFee = fees.get(key);
  if (currentFee === undefined) {
    return false;
  }

  const reserved = reservedFees.get(key) || 0;
  if (amount > currentFee - reserved) {
    return false;
  }

  reservedFees.set(key, reserved + amount);
  return true;
}

function releaseFeeReservation(studentId, amount) {
  const key = String(studentId);
  const reserved = reservedFees.get(key) || 0;
  if (amount >= reserved) {
    reservedFees.delete(key);
  } else {
    reservedFees.set(key, reserved - amount);
  }
}

function reduceFee(studentId, amount) {
  const key = String(studentId);
  const currentFee = fees.get(key);

  if (currentFee === undefined || amount > currentFee) {
    return false;
  }

  fees.set(key, currentFee - amount);
  releaseFeeReservation(key, amount);
  return true;
}

module.exports = { getFee, reserveFee, releaseFeeReservation, reduceFee };