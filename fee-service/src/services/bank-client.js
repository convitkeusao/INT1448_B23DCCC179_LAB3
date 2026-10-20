const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');
const config = require('../config/env');

const agents = {
  'http:': new http.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 10 }),
  'https:': new https.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 10 })
};
const retryableBankErrors = new Set([500, 502, 503, 504]);
const definitelyUnavailableCodes = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ENETUNREACH'
]);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestCharge(url, payload, idempotencyKey) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const timeout = setTimeout(() => {
      request.destroy(Object.assign(new Error('Hết thời gian chờ ngân hàng.'), {
        code: 'ETIMEDOUT'
      }));
    }, config.bankTimeoutMs);
    const finish = (callback, value) => {
      clearTimeout(timeout);
      callback(value);
    };
    const request = transport.request(url, {
      agent: agents[url.protocol],
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
        'idempotency-key': idempotencyKey
      }
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        try {
          finish(resolve, {
            statusCode: response.statusCode,
            body: body ? JSON.parse(body) : {}
          });
        } catch (error) {
          finish(reject, Object.assign(new Error('Ngân hàng trả về JSON không hợp lệ.'), {
            code: 'EBADRESPONSE',
            cause: error
          }));
        }
      });
      response.on('error', (error) => finish(reject, error));
    });

    request.on('error', (error) => finish(reject, error));
    request.end(payload);
  });
}

async function charge({ reference, amount, idempotencyKey }) {
  let url;
  try {
    url = new URL('/charges', config.bankUrl);
  } catch (error) {
    return {
      kind: 'failed',
      status: 'FAILED',
      httpStatus: 503,
      error: `BANK_URL không hợp lệ: ${error.message}`
    };
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return {
      kind: 'failed',
      status: 'FAILED',
      httpStatus: 503,
      error: 'BANK_URL chỉ hỗ trợ HTTP hoặc HTTPS.'
    };
  }

  const payload = JSON.stringify({ reference, amount });
  let outcomeMayBeAmbiguous = false;
  const maxAttempts = config.bankMaxRetries + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await requestCharge(url, payload, idempotencyKey);
      if (response.statusCode === 201) {
        return { kind: 'paid', chargeId: response.body.chargeId };
      }

      if (retryableBankErrors.has(response.statusCode) && attempt + 1 < maxAttempts) {
        await wait(50 * (2 ** attempt));
        continue;
      }

      const isTemporaryFailure = response.statusCode >= 500;
      return {
        kind: 'failed',
        status: 'FAILED',
        httpStatus: isTemporaryFailure ? 503 : (response.statusCode || 502),
        error: response.body.error || `Ngân hàng từ chối giao dịch (HTTP ${response.statusCode}).`
      };
    } catch (error) {
      if (definitelyUnavailableCodes.has(error.code)) {
        if (outcomeMayBeAmbiguous) {
          return {
            kind: 'failed',
            status: 'PENDING',
            httpStatus: 504,
            error: 'Mất kết nối sau một lần thử chưa rõ kết quả; chưa xác định ngân hàng đã trừ tiền hay chưa.'
          };
        }
        return {
          kind: 'failed',
          status: 'FAILED',
          httpStatus: 503,
          error: 'Không thể kết nối tới ngân hàng.'
        };
      }
      if (error.code === 'ETIMEDOUT') {
        return {
          kind: 'failed',
          status: 'PENDING',
          httpStatus: 504,
          error: 'Hết thời gian chờ; chưa xác định ngân hàng đã trừ tiền hay chưa.'
        };
      }

      const canSafelyRetryAmbiguousFailure = ['ECONNRESET', 'EPIPE', 'ECONNABORTED'].includes(error.code);
      if (canSafelyRetryAmbiguousFailure) {
        outcomeMayBeAmbiguous = true;
      }
      if (canSafelyRetryAmbiguousFailure && attempt + 1 < maxAttempts) {
        await wait(50 * (2 ** attempt));
        continue;
      }

      return {
        kind: 'failed',
        status: 'PENDING',
        httpStatus: 504,
        error: 'Mất kết nối trước khi nhận xác nhận; chưa xác định ngân hàng đã trừ tiền hay chưa.'
      };
    }
  }

  return {
    kind: 'failed',
    status: 'PENDING',
    httpStatus: 504,
    error: 'Không nhận được xác nhận từ ngân hàng.'
  };
}

module.exports = { charge };