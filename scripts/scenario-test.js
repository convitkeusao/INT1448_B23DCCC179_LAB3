const assert = require('node:assert/strict');

const FEE_URL = process.env.FEE_URL || 'http://localhost:4001';
const BANK_URL = process.env.BANK_URL || 'http://localhost:4002';
const SCENARIO = process.argv[2] || 'drop';
const AMOUNT = Number.parseInt(process.env.AMOUNT || '1000', 10);

async function readJson(url) {
  const response = await fetch(url);
  return { status: response.status, body: await response.json() };
}

async function stats() {
  const result = await readJson(`${BANK_URL}/stats`);
  if (result.status !== 200) {
    throw new Error(`Không đọc được bank stats: HTTP ${result.status}`);
  }
  return result.body;
}

async function payment(studentId, amount) {
  const response = await fetch(`${FEE_URL}/students/${studentId}/payments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  return { status: response.status, body: await response.json() };
}

async function runPool(count, concurrency, worker) {
  let next = 0;
  const results = new Array(count);
  async function runWorker() {
    while (true) {
      const index = next++;
      if (index >= count) return;
      results[index] = await worker(index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
  return results;
}

async function main() {
  if (SCENARIO === 'offline') {
    const startedAt = Date.now();
    const result = await payment('1', AMOUNT);
    const elapsedMs = Date.now() - startedAt;
    assert.equal(result.status, 503, 'Ngân hàng tắt phải trả HTTP 503.');
    assert.equal(result.body.status, 'FAILED');
    assert.ok(elapsedMs < 1500, `Thanh toán khi ngân hàng tắt mất ${elapsedMs}ms.`);
    console.log(JSON.stringify({ scenario: SCENARIO, elapsedMs, result }, null, 2));
    return;
  }

  const beforeStats = await stats();
  const beforeFees = await readJson(`${FEE_URL}/students/1/fees`);
  const startedAt = Date.now();
  let results;

  if (SCENARIO === 'limit') {
    results = [await payment('1', 25_000_000)];
  } else if (SCENARIO === 'slow') {
    results = [await payment('1', AMOUNT)];
  } else if (SCENARIO === 'drop' || SCENARIO === 'fail') {
    results = await runPool(60, 10, () => payment('1', AMOUNT));
  } else {
    throw new Error('Dùng: node scripts/scenario-test.js drop|fail|limit|slow|offline');
  }

  const elapsedMs = Date.now() - startedAt;
  const afterStats = await stats();
  const afterFees = await readJson(`${FEE_URL}/students/1/fees`);
  const paid = results.filter((result) => result.body.status === 'PAID');
  const pending = results.filter((result) => result.body.status === 'PENDING');
  const paidAmount = paid.reduce((sum, result) => sum + (result.body.amount || AMOUNT), 0);
  const feeReduction = beforeFees.body.amountDue - afterFees.body.amountDue;
  const bankRequests = afterStats.requests - beforeStats.requests;
  const newCharges = afterStats.charges - beforeStats.charges;
  const newDuplicates = afterStats.duplicates - beforeStats.duplicates;
  const otherFailures = results.length - paid.length - pending.length;

  if (SCENARIO === 'limit') {
    assert.equal(results[0].status, 402, 'Giao dịch vượt hạn mức phải trả HTTP 402.');
    assert.equal(results[0].body.status, 'FAILED');
    assert.equal(bankRequests, 1, 'Giao dịch bị từ chối không được thử lại.');
    assert.equal(newCharges, 0);
  } else if (SCENARIO === 'slow') {
    assert.equal(results[0].status, 504, 'Ngân hàng chậm phải trả HTTP 504.');
    assert.equal(results[0].body.status, 'PENDING');
    assert.ok(elapsedMs <= 4500, `Thanh toán chậm mất ${elapsedMs}ms.`);
  } else {
    assert.ok(paid.length >= 54, `Chỉ có ${paid.length}/60 giao dịch thành công.`);
    assert.equal(newDuplicates, 0, 'Không được trừ tiền trùng.');
    assert.equal(feeReduction, paidAmount, 'Công nợ phải giảm đúng bằng số tiền PAID.');
    assert.equal(newCharges, paid.length, 'Mỗi charge phải khớp một payment PAID.');
    assert.equal(otherFailures, 0, 'Chỉ chấp nhận PAID hoặc PENDING.');
  }

  console.log(JSON.stringify({
    scenario: SCENARIO,
    count: results.length,
    elapsedMs,
    paid: paid.length,
    pending: pending.length,
    otherFailures,
    paidAmount,
    feeReduction,
    bankStatsBefore: beforeStats,
    bankStatsAfter: afterStats,
    bankRequests,
    newCharges,
    newDuplicates,
    httpStatuses: results.reduce((counts, result) => {
      counts[result.status] = (counts[result.status] || 0) + 1;
      return counts;
    }, {})
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});