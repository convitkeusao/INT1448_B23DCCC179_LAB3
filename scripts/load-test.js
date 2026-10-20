const FEE_URL = process.env.FEE_URL || 'http://localhost:4001';
const BANK_URL = process.env.BANK_URL || 'http://localhost:4002';
const COUNT = Number.parseInt(process.env.COUNT || '200', 10);
const CONCURRENCY = Number.parseInt(process.env.CONCURRENCY || '10', 10);
const AMOUNT = Number.parseInt(process.env.AMOUNT || '1000', 10);
const STUDENT_ID = process.env.STUDENT_ID || '1';

async function getStats() {
  const response = await fetch(`${BANK_URL}/stats`);
  if (!response.ok) {
    throw new Error(`Không đọc được bank stats: HTTP ${response.status}`);
  }
  return response.json();
}

async function runPool(items, concurrency, worker) {
  let next = 0;
  const results = new Array(items.length);
  async function runWorker() {
    while (true) {
      const index = next++;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
  return results;
}

async function main() {
  if (!Number.isInteger(COUNT) || COUNT < 1 || !Number.isInteger(CONCURRENCY) || CONCURRENCY < 1) {
    throw new Error('COUNT và CONCURRENCY phải là số nguyên dương.');
  }

  const before = await getStats();
  const startedAt = Date.now();
  const results = await runPool(Array.from({ length: COUNT }), CONCURRENCY, async () => {
    const response = await fetch(`${FEE_URL}/students/${STUDENT_ID}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: AMOUNT })
    });
    return { ok: response.status === 201, status: response.status, body: await response.json() };
  });
  const elapsedMs = Date.now() - startedAt;
  const after = await getStats();
  const successes = results.filter((result) => result.ok).length;

  console.log(JSON.stringify({
    count: COUNT,
    concurrency: CONCURRENCY,
    amount: AMOUNT,
    successes,
    failures: COUNT - successes,
    elapsedMs,
    bankStatsBefore: before,
    bankStatsAfter: after,
    newTcpConnections: after.connections - before.connections
  }, null, 2));
  if (successes !== COUNT) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});