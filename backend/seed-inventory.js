
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const truckInventory = {
  'HVAC': [
    { name: 'Air Filter 16x20x1', sku: 'AF-1620', quantity: 10, minQuantity: 3, unitCost: 8.99, unitPrice: 24.99, category: 'Filters' },
    { name: 'Air Filter 20x25x1', sku: 'AF-2025', quantity: 8, minQuantity: 2, unitCost: 9.99, unitPrice: 27.99, category: 'Filters' },
    { name: 'Refrigerant R-410A 25lb', sku: 'REF-410A', quantity: 3, minQuantity: 1, unitCost: 89.99, unitPrice: 199.99, category: 'Refrigerant' },
    { name: 'Capacitor 45/5 MFD', sku: 'CAP-455', quantity: 6, minQuantity: 2, unitCost: 12.99, unitPrice: 49.99, category: 'Electrical' },
    { name: 'Contactor 2-Pole 40A', sku: 'CONT-40A', quantity: 4, minQuantity: 1, unitCost: 18.99, unitPrice: 59.99, category: 'Electrical' },
    { name: 'Thermostat Honeywell T6', sku: 'TSTAT-T6', quantity: 3, minQuantity: 1, unitCost: 34.99, unitPrice: 89.99, category: 'Controls' },
    { name: 'Blower Motor 1/2 HP', sku: 'BM-05HP', quantity: 2, minQuantity: 1, unitCost: 89.99, unitPrice: 249.99, category: 'Motors' },
    { name: 'Condensate Drain Pan', sku: 'CDP-14', quantity: 3, minQuantity: 1, unitCost: 14.99, unitPrice: 39.99, category: 'Accessories' },
    { name: 'Refrigerant Line Set 3/8', sku: 'LS-38', quantity: 2, minQuantity: 1, unitCost: 45.99, unitPrice: 119.99, category: 'Refrigerant' },
    { name: 'Duct Tape Professional', sku: 'DT-PRO', quantity: 5, minQuantity: 2, unitCost: 6.99, unitPrice: 18.99, category: 'Accessories' },
  ],
  'Plumbing': [
    { name: 'PVC Pipe 1/2 inch 10ft', sku: 'PVC-05', quantity: 12, minQuantity: 4, unitCost: 4.99, unitPrice: 14.99, category: 'Pipe' },
    { name: 'PVC Pipe 3/4 inch 10ft', sku: 'PVC-075', quantity: 10, minQuantity: 3, unitCost: 6.99, unitPrice: 18.99, category: 'Pipe' },
    { name: 'Copper Elbow 1/2 inch', sku: 'CE-05', quantity: 20, minQuantity: 5, unitCost: 1.49, unitPrice: 5.99, category: 'Fittings' },
    { name: 'Ball Valve 3/4 inch', sku: 'BV-075', quantity: 8, minQuantity: 2, unitCost: 8.99, unitPrice: 24.99, category: 'Valves' },
    { name: 'Wax Ring Toilet Seal', sku: 'WR-STD', quantity: 5, minQuantity: 2, unitCost: 4.99, unitPrice: 19.99, category: 'Toilet Parts' },
    { name: 'Water Heater Element 4500W', sku: 'WHE-4500', quantity: 4, minQuantity: 1, unitCost: 14.99, unitPrice: 44.99, category: 'Water Heater' },
    { name: 'Pipe Thread Sealant Tape', sku: 'PTFE-1', quantity: 15, minQuantity: 5, unitCost: 1.99, unitPrice: 6.99, category: 'Accessories' },
    { name: 'P-Trap 1-1/2 inch', sku: 'PT-15', quantity: 6, minQuantity: 2, unitCost: 5.99, unitPrice: 18.99, category: 'Drain Parts' },
    { name: 'Shut Off Valve Angle 1/2', sku: 'SOV-05', quantity: 10, minQuantity: 3, unitCost: 6.99, unitPrice: 19.99, category: 'Valves' },
    { name: 'Drain Snake 25ft', sku: 'DS-25', quantity: 2, minQuantity: 1, unitCost: 24.99, unitPrice: 69.99, category: 'Tools' },
  ],
  'Electrical': [
    { name: 'Wire 12 AWG 250ft Roll', sku: 'W12-250', quantity: 3, minQuantity: 1, unitCost: 49.99, unitPrice: 129.99, category: 'Wire' },
    { name: 'Wire 14 AWG 250ft Roll', sku: 'W14-250', quantity: 3, minQuantity: 1, unitCost: 39.99, unitPrice: 109.99, category: 'Wire' },
    { name: 'Circuit Breaker 20A Single', sku: 'CB-20S', quantity: 10, minQuantity: 3, unitCost: 8.99, unitPrice: 24.99, category: 'Breakers' },
    { name: 'Circuit Breaker 15A Single', sku: 'CB-15S', quantity: 10, minQuantity: 3, unitCost: 7.99, unitPrice: 22.99, category: 'Breakers' },
    { name: 'GFCI Outlet 20A White', sku: 'GFCI-20W', quantity: 8, minQuantity: 2, unitCost: 14.99, unitPrice: 39.99, category: 'Outlets' },
    { name: 'Outlet Duplex 15A White', sku: 'OUT-15W', quantity: 15, minQuantity: 5, unitCost: 2.99, unitPrice: 9.99, category: 'Outlets' },
    { name: 'Conduit EMT 1/2 inch 10ft', sku: 'EMT-05', quantity: 8, minQuantity: 2, unitCost: 7.99, unitPrice: 21.99, category: 'Conduit' },
    { name: 'Junction Box 4 inch', sku: 'JB-4', quantity: 10, minQuantity: 3, unitCost: 3.99, unitPrice: 12.99, category: 'Boxes' },
    { name: 'Light Switch Single Pole', sku: 'SW-SP', quantity: 10, minQuantity: 3, unitCost: 2.49, unitPrice: 8.99, category: 'Switches' },
    { name: 'Electrical Tape 3-Pack', sku: 'ET-3PK', quantity: 8, minQuantity: 2, unitCost: 4.99, unitPrice: 14.99, category: 'Accessories' },
  ],
  'Roofing': [
    { name: 'Architectural Shingles Bundle', sku: 'SH-ARCH', quantity: 20, minQuantity: 5, unitCost: 34.99, unitPrice: 89.99, category: 'Shingles' },
    { name: 'Roofing Nails 1-3/4 5lb', sku: 'RN-175', quantity: 10, minQuantity: 3, unitCost: 8.99, unitPrice: 24.99, category: 'Fasteners' },
    { name: 'Roofing Felt 15lb 4sq', sku: 'RF-15', quantity: 5, minQuantity: 2, unitCost: 19.99, unitPrice: 49.99, category: 'Underlayment' },
    { name: 'Ice & Water Shield 2sq', sku: 'IWS-2', quantity: 4, minQuantity: 1, unitCost: 49.99, unitPrice: 119.99, category: 'Underlayment' },
    { name: 'Step Flashing 3x4 Bundle', sku: 'SF-34', quantity: 6, minQuantity: 2, unitCost: 14.99, unitPrice: 39.99, category: 'Flashing' },
    { name: 'Ridge Cap Shingles Bundle', sku: 'RC-STD', quantity: 4, minQuantity: 1, unitCost: 44.99, unitPrice: 109.99, category: 'Shingles' },
    { name: 'Roofing Caulk Tube', sku: 'CAL-RF', quantity: 12, minQuantity: 4, unitCost: 5.99, unitPrice: 16.99, category: 'Sealant' },
    { name: 'Drip Edge Aluminum 10ft', sku: 'DE-10', quantity: 10, minQuantity: 3, unitCost: 7.99, unitPrice: 21.99, category: 'Flashing' },
    { name: 'Roof Deck Screws 1lb', sku: 'RDS-1', quantity: 8, minQuantity: 2, unitCost: 9.99, unitPrice: 27.99, category: 'Fasteners' },
    { name: 'Plywood 4x8 1/2 inch', sku: 'PLY-48', quantity: 6, minQuantity: 2, unitCost: 34.99, unitPrice: 79.99, category: 'Decking' },
  ]
};

async function seed() {
  console.log('🚛 Loading truck inventory for all companies...\n');

  const companies = await pool.query('SELECT id, name, industry FROM "Companies" WHERE id >= 3');
  
  for (const company of companies.rows) {
    const industry = company.industry ? 
      Object.keys(truckInventory).find(k => k.toLowerCase() === company.industry.toLowerCase()) 
      : null;
    
    if (!industry) {
      console.log('⚠️  Skipping ' + company.name + ' - industry not matched (' + company.industry + ')');
      continue;
    }

    const items = truckInventory[industry];
    const techs = await pool.query(`SELECT id FROM "Users" WHERE "companyId"=$1 AND role=$2`, [company.id, "technician"]);
    
    for (const item of items) {
      await pool.query(
        'INSERT INTO "Inventory" (name, sku, quantity, "minQuantity", "unitCost", "unitPrice", category, "companyId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())',
        [item.name, item.sku + '-' + company.id, item.quantity, item.minQuantity, item.unitCost, item.unitPrice, item.category, company.id]
      );
    }
    console.log('✅ ' + company.name + ' (' + industry + ') — ' + items.length + ' items loaded');
  }

  console.log('\n🎉 Done! All trucks stocked.');
  pool.end();
}

seed().catch(err => { console.error('Error:', err.message); pool.end(); });
