
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE = 'https://hvacfieldos-production.up.railway.app/api';
let token = '';
let companyId = '';
let customerId = '';
let workOrderId = '';
let invoiceId = '';
let passed = 0;
let failed = 0;

const testEmail = `test_${Date.now()}@helix8test.com`;
const testPassword = 'TestPass123$';

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.pass) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name} — ${result.reason}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${name} — ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n🧪 Helix8 API Test Suite');
  console.log('========================\n');

  // 1. Health check
  await test('Server health check', async () => {
    const res = await fetch(`${BASE.replace('/api','')}/health`);
    return { pass: res.status < 500, reason: `Status ${res.status}` };
  });

  // 2. Signup
  await test('Company signup', async () => {
    const res = await fetch(`${BASE}/auth/register-company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Test Company ' + Date.now(),
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        password: testPassword,
        industry: 'HVAC',
        employeeCount: '1-5',
        location: 'Atlanta, GA'
      })
    });
    const data = await res.json();
    if (data.token) { token = data.token; companyId = data.user?.companyId; }
    return { pass: !!data.token, reason: data.message || 'No token returned' };
  });

  // 3. Login (skip 2FA for test)
  await test('Login endpoint responds', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const data = await res.json();
    return { pass: res.status !== 500, reason: data.message || `Status ${res.status}` };
  });

  if (!token) {
    console.log('\n⚠️  No auth token — skipping authenticated tests\n');
    printSummary();
    return;
  }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // 4. Get customers
  await test('Get customers list', async () => {
    const res = await fetch(`${BASE}/customers`, { headers });
    const data = await res.json();
    return { pass: res.ok && Array.isArray(data.customers), reason: data.message };
  });

  // 5. Create customer
  await test('Create customer', async () => {
    const res = await fetch(`${BASE}/customers`, {
      method: 'POST', headers,
      body: JSON.stringify({ firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '404-555-0001', address: '123 Main St' })
    });
    const data = await res.json();
    if (data.customer?.id) customerId = data.customer.id;
    return { pass: !!data.customer?.id, reason: data.message };
  });

  // 6. Get work orders
  await test('Get work orders list', async () => {
    const res = await fetch(`${BASE}/work-orders`, { headers });
    const data = await res.json();
    return { pass: res.ok, reason: data.message };
  });

  // 7. Create work order
  await test('Create work order', async () => {
    const res = await fetch(`${BASE}/work-orders`, {
      method: 'POST', headers,
      body: JSON.stringify({ customerId, jobType: 'AC Repair', description: 'Test job', priority: 'normal', title: 'AC Repair' })
    });
    const data = await res.json();
    if (data.workOrder?.id) workOrderId = data.workOrder.id;
    return { pass: !!data.workOrder?.id, reason: data.message };
  });

  // 8. Update work order status
  await test('Update work order status', async () => {
    if (!workOrderId) return { pass: false, reason: 'No work order ID' };
    const res = await fetch(`${BASE}/work-orders/${workOrderId}/status`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ status: 'in_progress' })
    });
    return { pass: res.ok, reason: `Status ${res.status}` };
  });

  // 9. Create invoice
  await test('Create invoice', async () => {
    if (!customerId) return { pass: false, reason: 'No customer ID' };
    const res = await fetch(`${BASE}/invoices`, {
      method: 'POST', headers,
      body: JSON.stringify({
        customerId,
        workOrderId: workOrderId || null,
        lineItems: [{ description: 'Labor', quantity: 2, unitPrice: 100, total: 200 }],
        subtotal: 200, taxRate: 8.5, taxAmount: 17, total: 217
      })
    });
    const data = await res.json();
    if (data.invoice?.id) invoiceId = data.invoice.id;
    return { pass: !!data.invoice?.id, reason: data.message };
  });

  // 10. Get invoices
  await test('Get invoices list', async () => {
    const res = await fetch(`${BASE}/invoices`, { headers });
    const data = await res.json();
    return { pass: res.ok && Array.isArray(data.invoices), reason: data.message };
  });

  // 11. Public invoice endpoint
  await test('Public invoice view', async () => {
    if (!invoiceId) return { pass: false, reason: 'No invoice ID' };
    const res = await fetch(`${BASE}/invoices/${invoiceId}/public`);
    const data = await res.json();
    return { pass: !!data.invoice, reason: data.message };
  });

  // 12. Payment link
  await test('Generate Stripe payment link', async () => {
    if (!invoiceId) return { pass: false, reason: 'No invoice ID' };
    const res = await fetch(`${BASE}/invoices/${invoiceId}/payment-link-public`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    return { pass: !!data.url && data.url.includes('stripe'), reason: data.message };
  });

  // 13. Get inventory
  await test('Get inventory list', async () => {
    const res = await fetch(`${BASE}/inventory`, { headers });
    return { pass: res.ok, reason: `Status ${res.status}` };
  });

  // 14. Create inventory item
  await test('Create inventory item', async () => {
    const res = await fetch(`${BASE}/inventory`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: 'Test Filter', sku: 'TEST-001', quantity: 10, minQuantity: 2, unitCost: 15.99, category: 'Filters' })
    });
    const data = await res.json();
    return { pass: res.ok, reason: data.message };
  });

  // 15. Clock in
  await test('Time clock - clock in', async () => {
    const res = await fetch(`${BASE}/timeclock/clockin`, { method: 'POST', headers, body: JSON.stringify({}) });
    const data = await res.json();
    return { pass: res.ok || data.message === 'Already clocked in', reason: data.message };
  });

  // 16. Clock status
  await test('Time clock - get status', async () => {
    const res = await fetch(`${BASE}/timeclock/status`, { headers });
    const data = await res.json();
    return { pass: res.ok && typeof data.clockedIn === 'boolean', reason: data.message };
  });

  // 17. Clock out
  await test('Time clock - clock out', async () => {
    const res = await fetch(`${BASE}/timeclock/clockout`, { method: 'POST', headers, body: JSON.stringify({}) });
    const data = await res.json();
    return { pass: res.ok || data.message === 'Not clocked in', reason: data.message };
  });

  // 18. Payroll summary
  await test('Payroll summary', async () => {
    const res = await fetch(`${BASE}/payroll/summary?startDate=2026-01-01&endDate=2026-12-31`, { headers });
    const data = await res.json();
    return { pass: res.ok && Array.isArray(data.summary), reason: data.message };
  });

  // 19. Get users
  await test('Get team members', async () => {
    const res = await fetch(`${BASE}/users`, { headers });
    return { pass: res.ok, reason: `Status ${res.status}` };
  });

  // 20. Get billing plans
  await test('Get billing plans', async () => {
    const res = await fetch(`${BASE}/billing/plans`, { headers });
    const data = await res.json();
    return { pass: res.ok && Array.isArray(data.plans), reason: data.message };
  });

  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log('\n========================');
  console.log(`Results: ${passed}/${total} passed`);
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`⚠️  ${failed} test(s) failed — review above`);
  }
  console.log('========================\n');
}

run().catch(err => { console.error('Test runner error:', err.message); });
