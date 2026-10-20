const chargesByReference = new Map();
const chargesByIdempotencyKey = new Map();
let nextChargeId = 1;

function lookup(reference, amount, idempotencyKey) {
  const byKey = chargesByIdempotencyKey.get(idempotencyKey);
  if (byKey) {
    if (byKey.reference !== reference || byKey.amount !== amount) {
      return { conflict: true };
    }
    return { charge: byKey };
  }

  const byReference = chargesByReference.get(reference);
  if (byReference) {
    if (byReference.amount !== amount) {
      return { conflict: true };
    }
    chargesByIdempotencyKey.set(idempotencyKey, byReference);
    return { charge: byReference };
  }

  return { charge: null };
}

function create(reference, amount, idempotencyKey) {
  const existing = lookup(reference, amount, idempotencyKey);
  if (existing.conflict) {
    return { conflict: true };
  }
  if (existing.charge) {
    return { charge: existing.charge, duplicate: true };
  }

  const charge = {
    chargeId: `C${nextChargeId++}`,
    reference,
    amount
  };
  chargesByReference.set(reference, charge);
  chargesByIdempotencyKey.set(idempotencyKey, charge);
  return { charge, duplicate: false };
}

function getAll() {
  return Array.from(chargesByReference.values());
}

module.exports = { lookup, create, getAll };