
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const estimateTemplates = {
  'hvac': [
    { title: 'AC Unit Full Replacement', description: 'Replace 3-ton central AC unit including labor', items: [{ description: 'Carrier 3-Ton AC Unit', quantity: 1, unitPrice: 2800 }, { description: 'Labor - Installation', quantity: 8, unitPrice: 95 }, { description: 'Refrigerant R-410A', quantity: 1, unitPrice: 180 }, { description: 'Disposal of old unit', quantity: 1, unitPrice: 75 }] },
    { title: 'Furnace Replacement', description: 'Replace existing gas furnace with high efficiency unit', items: [{ description: 'Carrier 80% AFUE Furnace', quantity: 1, unitPrice: 1900 }, { description: 'Labor - Installation', quantity: 6, unitPrice: 95 }, { description: 'Gas line inspection', quantity: 1, unitPrice: 150 }] },
    { title: 'HVAC Tune-Up & Maintenance', description: 'Full system inspection and tune-up', items: [{ description: 'System inspection', quantity: 1, unitPrice: 89 }, { description: 'Filter replacement', quantity: 2, unitPrice: 24.99 }, { description: 'Coil cleaning', quantity: 1, unitPrice: 120 }] },
    { title: 'Ductwork Repair & Sealing', description: 'Repair and seal leaking ductwork throughout home', items: [{ description: 'Duct inspection', quantity: 1, unitPrice: 150 }, { description: 'Duct sealing (per section)', quantity: 8, unitPrice: 75 }, { description: 'Labor', quantity: 4, unitPrice: 95 }] },
    { title: 'Thermostat Upgrade - Smart', description: 'Install Nest smart thermostat', items: [{ description: 'Nest Thermostat E', quantity: 1, unitPrice: 149 }, { description: 'Installation & setup', quantity: 1, unitPrice: 89 }] },
    { title: 'Mini-Split Installation', description: 'Install ductless mini-split system in bonus room', items: [{ description: 'Mitsubishi 12000 BTU Mini-Split', quantity: 1, unitPrice: 1400 }, { description: 'Labor - Installation', quantity: 6, unitPrice: 95 }, { description: 'Electrical connection', quantity: 1, unitPrice: 250 }] },
  ],
  'plumbing': [
    { title: 'Water Heater Replacement', description: 'Replace 40-gallon water heater', items: [{ description: 'Rheem 40gal Water Heater', quantity: 1, unitPrice: 650 }, { description: 'Labor - Installation', quantity: 4, unitPrice: 95 }, { description: 'Permit fee', quantity: 1, unitPrice: 75 }, { description: 'Disposal of old unit', quantity: 1, unitPrice: 50 }] },
    { title: 'Bathroom Remodel Plumbing', description: 'Full plumbing for master bath remodel', items: [{ description: 'Supply lines & shutoffs', quantity: 1, unitPrice: 180 }, { description: 'Drain rough-in', quantity: 1, unitPrice: 320 }, { description: 'Labor', quantity: 8, unitPrice: 95 }, { description: 'Permit', quantity: 1, unitPrice: 100 }] },
    { title: 'Sewer Line Repair', description: 'Repair damaged sewer line in backyard', items: [{ description: 'Camera inspection', quantity: 1, unitPrice: 250 }, { description: 'Excavation (per foot)', quantity: 12, unitPrice: 45 }, { description: 'Pipe replacement (per foot)', quantity: 12, unitPrice: 38 }, { description: 'Labor', quantity: 6, unitPrice: 95 }] },
    { title: 'Kitchen Faucet & Disposal Install', description: 'Install new kitchen faucet and garbage disposal', items: [{ description: 'Moen Kitchen Faucet', quantity: 1, unitPrice: 220 }, { description: 'InSinkErator 1/2 HP Disposal', quantity: 1, unitPrice: 180 }, { description: 'Labor - Installation', quantity: 2, unitPrice: 95 }] },
    { title: 'Whole Home Repiping', description: 'Replace all supply lines with PEX piping', items: [{ description: 'PEX pipe & fittings', quantity: 1, unitPrice: 1200 }, { description: 'Labor', quantity: 16, unitPrice: 95 }, { description: 'Permit', quantity: 1, unitPrice: 150 }, { description: 'Drywall patches', quantity: 6, unitPrice: 75 }] },
    { title: 'Toilet Replacement x2', description: 'Replace two toilets with water-efficient models', items: [{ description: 'American Standard Toilet', quantity: 2, unitPrice: 280 }, { description: 'Wax ring & hardware', quantity: 2, unitPrice: 25 }, { description: 'Labor per toilet', quantity: 2, unitPrice: 120 }] },
  ],
  'electrical': [
    { title: 'Panel Upgrade 200A', description: 'Upgrade electrical panel from 100A to 200A service', items: [{ description: '200A Panel & breakers', quantity: 1, unitPrice: 1800 }, { description: 'Labor - Installation', quantity: 8, unitPrice: 110 }, { description: 'Permit & inspection', quantity: 1, unitPrice: 200 }, { description: 'Utility coordination', quantity: 1, unitPrice: 150 }] },
    { title: 'EV Charger Installation', description: 'Install Level 2 EV charging outlet in garage', items: [{ description: 'ChargePoint 40A EVSE', quantity: 1, unitPrice: 650 }, { description: '50A circuit & wiring', quantity: 1, unitPrice: 380 }, { description: 'Labor', quantity: 3, unitPrice: 110 }, { description: 'Permit', quantity: 1, unitPrice: 100 }] },
    { title: 'Whole Home Generator Hookup', description: 'Install transfer switch for portable generator', items: [{ description: 'Manual transfer switch', quantity: 1, unitPrice: 450 }, { description: 'Labor - Installation', quantity: 4, unitPrice: 110 }, { description: 'Permit', quantity: 1, unitPrice: 100 }] },
    { title: 'Kitchen Circuit Addition', description: 'Add dedicated circuits for kitchen appliances', items: [{ description: '20A circuits (each)', quantity: 3, unitPrice: 280 }, { description: 'GFCI outlets', quantity: 4, unitPrice: 45 }, { description: 'Labor', quantity: 4, unitPrice: 110 }] },
    { title: 'Outdoor Lighting Installation', description: 'Install landscape and security lighting', items: [{ description: 'Outdoor fixtures', quantity: 6, unitPrice: 85 }, { description: 'Low voltage wiring', quantity: 1, unitPrice: 220 }, { description: 'Labor', quantity: 5, unitPrice: 110 }, { description: 'Smart controller', quantity: 1, unitPrice: 180 }] },
    { title: 'Smoke & CO Detector Upgrade', description: 'Replace all detectors with interconnected units', items: [{ description: 'Nest Protect detectors', quantity: 6, unitPrice: 119 }, { description: 'Labor - Installation', quantity: 2, unitPrice: 110 }] },
  ],
  'roofing': [
    { title: 'Full Roof Replacement', description: 'Complete tear-off and replacement with architectural shingles', items: [{ description: 'Architectural shingles (per sq)', quantity: 24, unitPrice: 95 }, { description: 'Labor (per sq)', quantity: 24, unitPrice: 75 }, { description: 'Ice & water shield', quantity: 4, unitPrice: 120 }, { description: 'Ridge cap & flashing', quantity: 1, unitPrice: 450 }, { description: 'Permit', quantity: 1, unitPrice: 150 }] },
    { title: 'Roof Repair - Storm Damage', description: 'Repair storm damaged sections and replace missing shingles', items: [{ description: 'Shingle replacement (per sq)', quantity: 4, unitPrice: 95 }, { description: 'Labor', quantity: 6, unitPrice: 85 }, { description: 'Flashing repair', quantity: 1, unitPrice: 200 }] },
    { title: 'Gutter Replacement', description: 'Remove and replace all gutters and downspouts', items: [{ description: '6-inch seamless gutters (per ft)', quantity: 180, unitPrice: 8 }, { description: 'Downspouts', quantity: 4, unitPrice: 85 }, { description: 'Labor', quantity: 6, unitPrice: 85 }, { description: 'Gutter guards', quantity: 180, unitPrice: 4 }] },
    { title: 'Skylight Installation', description: 'Install two Velux skylights with flashing kit', items: [{ description: 'Velux Fixed Skylight', quantity: 2, unitPrice: 650 }, { description: 'Flashing kit', quantity: 2, unitPrice: 180 }, { description: 'Labor - Installation', quantity: 6, unitPrice: 85 }, { description: 'Interior finish', quantity: 2, unitPrice: 150 }] },
    { title: 'Flat Roof Coating', description: 'Apply elastomeric coating to commercial flat roof', items: [{ description: 'Elastomeric coating (per sq)', quantity: 20, unitPrice: 45 }, { description: 'Primer coat', quantity: 1, unitPrice: 380 }, { description: 'Labor', quantity: 8, unitPrice: 85 }] },
    { title: 'Chimney Flashing Repair', description: 'Repair and reseal chimney flashing and step flashing', items: [{ description: 'Step flashing replacement', quantity: 1, unitPrice: 280 }, { description: 'Counter flashing', quantity: 1, unitPrice: 220 }, { description: 'Sealant & caulking', quantity: 1, unitPrice: 85 }, { description: 'Labor', quantity: 3, unitPrice: 85 }] },
  ]
};

const statuses = ['draft', 'sent', 'sent', 'approved', 'approved', 'declined', 'converted'];

async function seed() {
  console.log('📋 Seeding estimates for all companies...\n');

  const companies = await pool.query('SELECT id, name, industry FROM "Companies" WHERE id >= 3 AND id <= 6');
  
  for (const company of companies.rows) {
    const industry = company.industry?.toLowerCase();
    const templates = estimateTemplates[industry];
    
    if (!templates) {
      console.log('⚠️  Skipping ' + company.name + ' - no templates for industry: ' + industry);
      continue;
    }

    const customers = await pool.query('SELECT id FROM "Customers" WHERE "companyId"=$1 LIMIT 5', [company.id]);
    if (customers.rows.length === 0) {
      console.log('⚠️  No customers for ' + company.name);
      continue;
    }

    let count = 0;
    for (const template of templates) {
      const customer = customers.rows[Math.floor(Math.random() * customers.rows.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const lineItems = template.items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice
      }));
      
      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const taxRate = 8.5;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      const estimateNumber = 'EST-2026-' + String(Math.floor(Math.random() * 9000) + 1000);
      
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      await pool.query(`
        INSERT INTO "Estimates" ("estimateNumber", "customerId", "companyId", title, description, "lineItems", subtotal, "taxRate", "taxAmount", total, "validDays", status, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,30,$11,$12,$12)
      `, [estimateNumber, customer.id, company.id, template.title, template.description, JSON.stringify(lineItems), subtotal, taxRate, taxAmount, total, status, createdAt]);
      count++;
    }

    const totalValue = templates.reduce((sum, t) => {
      const sub = t.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      return sum + sub * 1.085;
    }, 0);

    console.log('✅ ' + company.name + ' — ' + count + ' estimates ($' + totalValue.toFixed(0) + ' pipeline)');
  }

  console.log('\n🎉 Done! All estimates seeded.');
  pool.end();
}

seed().catch(err => { console.error('Error:', err.message); pool.end(); });
