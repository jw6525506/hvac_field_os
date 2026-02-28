
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE = 'https://hvacfieldos-production.up.railway.app/api';

const companies = [
  { email: 'admin@atlantahvacpro.com' },
  { email: 'admin@gulfcoastplumbing.com' },
  { email: 'admin@sunshineelectric.com' },
  { email: 'admin@rockymtnroofing.com' },
];

let passed = 0;
let failed = 0;
let totalRequests = 0;
const errors = [];

async function getToken(email) {
  const res = await fetch(`${BASE}/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  return data.token;
}

async function request(label, fn) {
  totalRequests++;
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    if (result.ok) {
      passed++;
      if (totalRequests % 50 === 0) console.log(`  [${totalRequests}] ${label} - ${ms}ms`);
    } else {
      failed++;
      errors.push(`${label}: ${result.reason}`);
    }
  } catch (err) {
    failed++;
    errors.push(`${label}: ${err.message}`);
  }
}

async function simulateCompany(email, rounds) {
  const token = await getToken(email);
  if (!token) { console.log('No token for ' + email); return; }
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  for (let i = 0; i < rounds; i++) {
    // Dashboard loads
    await request('GET customers', async () => {
      const r = await fetch(`${BASE}/customers`, { headers });
      return { ok: r.ok, reason: r.status };
    });
    await request('GET work-orders', async () => {
      const r = await fetch(`${BASE}/work-orders`, { headers });
      return { ok: r.ok, reason: r.status };
    });
    await request('GET invoices', async () => {
      const r = await fetch(`${BASE}/invoices`, { headers });
      return { ok: r.ok, reason: r.status };
    });
    await request('GET inventory', async () => {
      const r = await fetch(`${BASE}/inventory`, { headers });
      return { ok: r.ok, reason: r.status };
    });
    await request('GET users', async () => {
      const r = await fetch(`${BASE}/users`, { headers });
      return { ok: r.ok, reason: r.status };
    });
    await request('GET payroll summary', async () => {
      const r = await fetch(`${BASE}/payroll/summary?startDate=2026-02-01&endDate=2026-02-28`, { headers });
      return { ok: r.ok, reason: r.status };
    });
    await request('GET timeclock status', async () => {
      const r = await fetch(`${BASE}/timeclock/status`, { headers });
      return { ok: r.ok, reason: r.status };
    });
    await request('GET billing plans', async () => {
      const r = await fetch(`${BASE}/billing/plans`, { headers });
      return { ok: r.ok, reason: r.status };
    });

    // Small delay between rounds to simulate real usage
    await new Promise(r => setTimeout(r, 200));
  }
}

async function run() {
  console.log('\n🔥 Helix8 Load Test');
  console.log('====================');
  console.log('Simulating 400 requests across 4 companies...\n');

  const start = Date.now();

  // Run all 4 companies concurrently, 12 rounds each = ~400 requests
  await Promise.all(companies.map(c => simulateCompany(c.email, 12)));

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n====================');
  console.log('Load Test Results');
  console.log('====================');
  console.log('Total Requests: ' + totalRequests);
  console.log('Passed:         ' + passed);
  console.log('Failed:         ' + failed);
  console.log('Duration:       ' + duration + 's');
  console.log('Avg per second: ' + (totalRequests / parseFloat(duration)).toFixed(1));
  console.log('Success Rate:   ' + ((passed/totalRequests)*100).toFixed(1) + '%');

  if (errors.length > 0) {
    console.log('\nErrors:');
    [...new Set(errors)].forEach(e => console.log('  ❌ ' + e));
  } else {
    console.log('\n🎉 All requests succeeded!');
  }
  console.log('====================\n');
}

run().catch(console.error);
