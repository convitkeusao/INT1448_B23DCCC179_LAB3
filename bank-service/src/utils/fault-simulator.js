const config = require('../config/env');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function beforeCharge() {
  if (config.delayMs > 0) {
    await wait(config.delayMs);
  }
  if (Math.random() < config.failRate) {
    return { error: 'Ngân hàng gặp lỗi tạm thời trước khi trừ tiền.' };
  }
  return null;
}

function shouldDropResponse() {
  return Math.random() < config.dropRate;
}

module.exports = { beforeCharge, shouldDropResponse };