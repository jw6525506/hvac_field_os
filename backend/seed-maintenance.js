
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const planTemplates = {
  'hvac': [
    { name: 'Basic Tune-Up Plan', description: 'Annual AC & heating inspection', price: 19.99, interval: 'monthly', visits: 2, features: 'Annual inspection, Filter replacement, Priority scheduling' },
    { name: 'Premium Comfort Plan', description: 'Bi-annual full system service with parts discount', price: 39.99, interval: 'monthly', visits: 4, features: 'Bi-annual service, 15% off parts, Same-day priority, Coil cleaning' },
    { name: 'Total Home HVAC Plan', description: 'Unlimited visits + full coverage', price: 79.99, interval: 'monthly', visits: 12, features: 'Unlimited visits, 20% off all repairs, Emergency service, Free filters' },
  ],
  'plumbing': [
    { name: 'Plumbing Peace of Mind', description: 'Annual plumbing inspection & water heater check', price: 14.99, interval: 'monthly', visits: 1, features: 'Annual inspection, Water heater flush, Leak check, Priority scheduling' },
    { name: 'Home Protection Plan', description: 'Bi-annual plumbing service with discount on repairs', price: 29.99, interval: 'monthly', visits: 2, features: 'Bi-annual service, 10% off repairs, Drain cleaning, Priority response' },
  ],
  'electrical': [
    { name: 'Electrical Safety Plan', description: 'Annual electrical panel and safety inspection', price: 16.99, interval: 'monthly', visits: 1, features: 'Panel inspection, GFCI testing, Surge protection check, Priority scheduling' },
    { name: 'Full Home Electrical Plan', description: 'Comprehensive electrical coverage and maintenance', price: 34.99, interval: 'monthly', visits: 2, features: 'Bi-annual inspection, 10% off repairs, Code compliance check, Emergency priority' },
  ],
  'roofing': [
    { name: 'Roof Watch Plan', description: 'Annual roof inspection and minor repairs', price: 24.99, interval: 'monthly', visits: 1, features: 'Annual inspection, Minor repairs included, Gutter check, Storm damage priority' },
    { name: 'Full Roof Protection', description: 'Bi-annual inspection plus preventive maintenance', price: 49.99, interval: 'monthly', visits: 2, features: 'Bi-annual inspection, Sealant reapplication, Flashing check, 10% off major repairs' },
  ]
};

async function seed() {
  console.log('🔧 Seeding maintenance plans & subscribers...\n');

  const companies = await pool.query('SELECT id, name, industry FROM "Companies" WHERE id >= 3 AND id <= 6');

  for (const company of companies.rows) {
    const industry = company.industry?.toLowerCase();
    const templates = planTemplates[industry];
    if (!templates) { console.log('⚠️  Skipping ' + company.name); continue; }

    // Create plans
    const planIds = [];
    for (const t of templates) {
      const res = await pool.query(
        `INSERT INTO "MaintenancePlans" (name, description, price, interval, visits, features, "companyId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING id`,
        [t.name, t.description, t.price, t.interval, t.visits, t.features, company.id]
      );
      planIds.push(res.rows[0].id);
    }

    // Get customers and enroll them
    const customers = await pool.query('SELECT id FROM "Customers" WHERE "companyId"=$1', [company.id]);
    const statuses = ['active', 'active', 'active', 'paused', 'cancelled'];
    
    let enrolled = 0;
    for (const customer of customers.rows) {
      const planId = planIds[Math.floor(Math.random() * planIds.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const startDate = new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000);
      await pool.query(
        `INSERT INTO "MaintenanceSubscriptions" ("customerId", "planId", "companyId", "startDate", status, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
        [customer.id, planId, company.id, startDate, status]
      );
      enrolled++;
    }

    const activeSubs = customers.rows.length;
    const avgPrice = templates.reduce((s, t) => s + t.price, 0) / templates.length;
    console.log(`✅ ${company.name} — ${templates.length} plans, ${enrolled} subscribers, ~$${(activeSubs * avgPrice).toFixed(0)}/mo MRR`);
  }

  console.log('\n🎉 Done! Maintenance plans seeded.');
  pool.end();
}

seed().catch(err => { console.error('Error:', err.message); pool.end(); });
