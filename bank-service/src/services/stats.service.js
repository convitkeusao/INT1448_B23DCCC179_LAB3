const chargeRepository = require('../repositories/charge.repository');

let connections = 0;
let requests = 0;

function recordConnection() {
  connections += 1;
}

function recordRequest() {
  requests += 1;
}

function getStats() {
  return {
    connections,
    requests,
    charges: chargeRepository.getAll().length,
    duplicates: 0
  };
}

module.exports = { recordConnection, recordRequest, getStats };