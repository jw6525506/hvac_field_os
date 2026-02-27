
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { host: 'localhost', database: 'hvac_field_os', user: 'postgres', password: 'password123', port: 5433 }
);

const companies = [
  { name: 'Atlanta HVAC Pro', industry: 'HVAC', city: 'Atlanta', state: 'GA', phone: '404-555-0101', email: 'admin@atlantahvacpro.com' },
  { name: 'Gulf Coast Plumbing', industry: 'Plumbing', city: 'Houston', state: 'TX', phone: '713-555-0202', email: 'admin@gulfcoastplumbing.com' },
  { name: 'Sunshine Electric', industry: 'Electrical', city: 'Miami', state: 'FL', phone: '305-555-0303', email: 'admin@sunshineelectric.com' },
  { name: 'Rocky Mountain Roofing', industry: 'Roofing', city: 'Denver', state: 'CO', phone: '720-555-0404', email: 'admin@rockymtnroofing.com' },
];

const firstNames = ['James', 'Maria', 'Carlos', 'Ashley', 'David', 'Jennifer', 'Michael', 'Lisa', 'Robert', 'Patricia'];
const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore'];
const jobTypes = ['AC Repair', 'Furnace Install', 'Pipe Leak Fix', 'Electrical Panel Upgrade', 'Roof Inspection', 'Water Heater Replace', 'Duct Cleaning', 'Drain Unclog', 'Circuit Breaker Fix', 'Shingle Replacement'];
const statuses = ['scheduled', 'in_progress', 'completed', 'completed', 'completed'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysAgo));
  return d.toISOString();
}

async function seed() {
  console.log('Starting seed...\n');

  for (const company of companies) {
    const compRes = await pool.query(
      `INSERT INTO "Companies" (name, email, phone, industry, location, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING id`,
      [company.name, company.email, company.phone, company.industry, company.city + ", " + company.state]
    );
    const companyId = compRes.rows[0].id;
    console.log('Created company: ' + company.name + ' (id: ' + companyId + ')');

    const adminHash = await bcrypt.hash('Admin1234$', 10);
    await pool.query(
      `INSERT INTO "Users" ("firstName", "lastName", email, password, role, "companyId", "hourlyRate", "commissionRate", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,'admin',$5,0,0,NOW(),NOW())`,
      [randomItem(firstNames), randomItem(lastNames), company.email, adminHash, companyId]
    );

    const techCount = randomInt(2, 3);
    const techIds = [];
    for (let t = 0; t < techCount; t++) {
      const fn = randomItem(firstNames);
      const ln = randomItem(lastNames);
      const techEmail = 'tech' + (t+1) + '@' + company.email.split('@')[1];
      const techHash = await bcrypt.hash('Tech1234$', 10);
      const techRes = await pool.query(
        `INSERT INTO "Users" ("firstName", "lastName", email, password, role, "companyId", "hourlyRate", "commissionRate", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,'technician',$5,$6,$7,NOW(),NOW()) RETURNING id`,
        [fn, ln, techEmail, techHash, companyId, randomInt(18, 35), randomInt(3, 10)]
      );
      techIds.push({ id: techRes.rows[0].id, name: fn + ' ' + ln });
      console.log('  Technician: ' + fn + ' ' + ln + ' (' + techEmail + ')');
    }

    const customerIds = [];
    const custCount = randomInt(5, 8);
    for (let c = 0; c < custCount; c++) {
      const fn = randomItem(firstNames);
      const ln = randomItem(lastNames);
      const custRes = await pool.query(
        `INSERT INTO "Customers" ("firstName", "lastName", email, phone, address, "companyId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING id`,
        [fn, ln, fn.toLowerCase() + '.' + ln.toLowerCase() + '@gmail.com', randomInt(200,999) + '-555-' + randomInt(1000,9999), randomInt(100,9999) + ' Main St ' + company.city + ' ' + company.state, companyId]
      );
      customerIds.push(custRes.rows[0].id);
    }
    console.log('  Created ' + custCount + ' customers');

    const woCount = randomInt(8, 12);
    let invoiceCount = 0;
    for (let w = 0; w < woCount; w++) {
      const jobType = randomItem(jobTypes);
      const status = randomItem(statuses);
      const tech = randomItem(techIds);
      const custId = randomItem(customerIds);
      const scheduledDate = randomDate(30);

      const woRes = await pool.query(
        `INSERT INTO "WorkOrders" (title, "customerId", "jobType", description, priority, status, "scheduledDate", "companyId", "assignedTo", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING id`,
        [jobType, custId, jobType, 'Customer reported issue with ' + jobType.toLowerCase() + '. Technician dispatched.', randomItem(['low','normal','high']), status, scheduledDate, companyId, tech.id]
      );
      const woId = woRes.rows[0].id;

      if (status === 'completed') {
        const lineItems = [
          { description: 'Labor', quantity: randomInt(1,4), unitPrice: randomInt(75,150), total: 0 },
          { description: 'Parts & Materials', quantity: 1, unitPrice: randomInt(50,300), total: 0 },
        ];
        lineItems.forEach(item => { item.total = item.quantity * item.unitPrice; });
        const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
        const taxRate = 8.5;
        const taxAmount = subtotal * taxRate / 100;
        const total = subtotal + taxAmount;
        const invStatus = randomItem(['paid', 'paid', 'unpaid']);
        const invNum = 'INV-' + new Date().getFullYear() + '-' + randomInt(1000,9999);

        await pool.query(
          `INSERT INTO "Invoices" ("invoiceNumber", "workOrderId", "customerId", "companyId", status, "lineItems", subtotal, "taxRate", "taxAmount", total, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
          [invNum, woId, custId, companyId, invStatus, JSON.stringify(lineItems), subtotal, taxRate, taxAmount, total]
        );
        invoiceCount++;

        const clockIn = new Date(scheduledDate);
        const minutes = randomInt(60, 240);
        const clockOut = new Date(clockIn.getTime() + minutes * 60000);
        await pool.query(
          `INSERT INTO "TimeEntries" ("userId", "workOrderId", "companyId", "clockIn", "clockOut", "totalMinutes", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
          [tech.id, woId, companyId, clockIn.toISOString(), clockOut.toISOString(), minutes]
        );
      }
    }
    console.log('  Created ' + woCount + ' work orders, ' + invoiceCount + ' invoices\n');
  }

  console.log('Seed complete!');
  console.log('Admin password: Admin1234$');
  console.log('Tech password:  Tech1234$');
  pool.end();
}

seed().catch(err => { console.error('Seed error:', err.message); pool.end(); });
