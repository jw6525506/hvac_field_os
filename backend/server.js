require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hvac_field_os',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password123',
  port: 5432,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.json());

// ─── AUTH MIDDLEWARE ──────────────────────────────────────

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// ─── HEALTH ──────────────────────────────────────────────

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// ─── AUTH ────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const result = await pool.query('SELECT * FROM "Users" WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Get company info
    let company = null;
    if (user.companyId) {
      const companyResult = await pool.query('SELECT * FROM "Companies" WHERE id = $1', [user.companyId]);
      company = companyResult.rows[0] || null;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
      },
      company,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.post('/api/auth/register-company', async (req, res) => {
  const { companyName, companyEmail, companyPhone, firstName, lastName, email, password } = req.body;
  if (!companyName || !firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if email already exists
    const existing = await client.query('SELECT id FROM "Users" WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create company
    const companyResult = await client.query(
      `INSERT INTO "Companies" (name, email, phone, plan, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'trial', NOW(), NOW()) RETURNING *`,
      [companyName, companyEmail || email, companyPhone || null]
    );
    const company = companyResult.rows[0];

    // Create admin user for company
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO "Users" ("firstName", "lastName", email, password, role, "companyId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'admin', $5, NOW(), NOW()) RETURNING *`,
      [firstName, lastName, email, hashedPassword, company.id]
    );
    const user = userResult.rows[0];

    await client.query('COMMIT');

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, companyId: company.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email, firstName, lastName, role: 'admin', companyId: company.id },
      company,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register company error:', err.message);
    res.status(500).json({ message: 'Server error during registration' });
  } finally {
    client.release();
  }
});

// ─── COMPANIES ───────────────────────────────────────────

app.get('/api/company', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Companies" WHERE id = $1', [req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Company not found' });
    res.json({ company: result.rows[0] });
  } catch (err) {
    console.error('GET company error:', err.message);
    res.status(500).json({ message: 'Failed to load company' });
  }
});

app.put('/api/company', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, phone, address } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "Companies" SET name=$1, email=$2, phone=$3, address=$4, "updatedAt"=NOW()
       WHERE id=$5 RETURNING *`,
      [name, email, phone, address, req.user.companyId]
    );
    res.json({ company: result.rows[0] });
  } catch (err) {
    console.error('PUT company error:', err.message);
    res.status(500).json({ message: 'Failed to update company' });
  }
});

// ─── USERS (admin only) ───────────────────────────────────

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, "firstName", "lastName", email, role, "companyId", "createdAt" FROM "Users" WHERE "companyId" = $1 ORDER BY "createdAt" DESC',
      [req.user.companyId]
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('GET users error:', err.message);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const existing = await pool.query('SELECT id FROM "Users" WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO "Users" ("firstName", "lastName", email, password, role, "companyId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, "firstName", "lastName", email, role, "companyId", "createdAt"`,
      [firstName, lastName, email, hashedPassword, role || 'technician', req.user.companyId]
    );
    res.json({ message: 'User created', user: result.rows[0] });
  } catch (err) {
    console.error('POST user error:', err.message);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { firstName, lastName, email, role, password } = req.body;
  try {
    let query, params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `UPDATE "Users" SET "firstName"=$1, "lastName"=$2, email=$3, role=$4, password=$5, "updatedAt"=NOW()
               WHERE id=$6 AND "companyId"=$7 RETURNING id, "firstName", "lastName", email, role`;
      params = [firstName, lastName, email, role, hashedPassword, req.params.id, req.user.companyId];
    } else {
      query = `UPDATE "Users" SET "firstName"=$1, "lastName"=$2, email=$3, role=$4, "updatedAt"=NOW()
               WHERE id=$5 AND "companyId"=$6 RETURNING id, "firstName", "lastName", email, role`;
      params = [firstName, lastName, email, role, req.params.id, req.user.companyId];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user: result.rows[0] });
  } catch (err) {
    console.error('PUT user error:', err.message);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }
  try {
    const result = await pool.query(
      'DELETE FROM "Users" WHERE id=$1 AND "companyId"=$2 RETURNING *',
      [req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('DELETE user error:', err.message);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ─── CUSTOMERS ───────────────────────────────────────────

app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "Customers" WHERE "companyId" = $1 ORDER BY "createdAt" DESC',
      [req.user.companyId]
    );
    res.json({ customers: result.rows });
  } catch (err) {
    console.error('GET customers error:', err.message);
    res.status(500).json({ message: 'Failed to load customers' });
  }
});

app.post('/api/customers', requireAuth, async (req, res) => {
  const { firstName, lastName, phone, email, address } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "Customers" ("firstName", "lastName", phone, email, address, "companyId")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [firstName, lastName, phone, email, address, req.user.companyId]
    );
    res.json({ message: 'Customer created', customer: result.rows[0] });
  } catch (err) {
    console.error('POST customer error:', err.message);
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

app.put('/api/customers/:id', requireAuth, async (req, res) => {
  const { firstName, lastName, phone, email, address } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "Customers" SET "firstName"=$1, "lastName"=$2, phone=$3, email=$4, address=$5, "updatedAt"=NOW()
       WHERE id=$6 AND "companyId"=$7 RETURNING *`,
      [firstName, lastName, phone, email, address, req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer updated', customer: result.rows[0] });
  } catch (err) {
    console.error('PUT customer error:', err.message);
    res.status(500).json({ message: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM "Customers" WHERE id=$1 AND "companyId"=$2 RETURNING *',
      [req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('DELETE customer error:', err.message);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

app.get('/api/customers/:id/jobs', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "WorkOrders" WHERE "customerId"=$1 AND "companyId"=$2 ORDER BY "createdAt" DESC',
      [req.params.id, req.user.companyId]
    );
    res.json({ jobs: result.rows });
  } catch (err) {
    console.error('GET customer jobs error:', err.message);
    res.status(500).json({ message: 'Failed to load jobs' });
  }
});

// ─── WORK ORDERS ─────────────────────────────────────────

app.get('/api/work-orders', requireAuth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'technician') {
      // Technicians only see their own assigned jobs
      query = `
        SELECT wo.*, c."firstName", c."lastName"
        FROM "WorkOrders" wo
        LEFT JOIN "Customers" c ON wo."customerId" = c.id
        WHERE wo."companyId" = $1 AND wo."assignedTo" = $2
        ORDER BY wo."createdAt" DESC
      `;
      params = [req.user.companyId, req.user.id];
    } else {
      // Admins see all jobs for their company
      query = `
        SELECT wo.*, c."firstName", c."lastName"
        FROM "WorkOrders" wo
        LEFT JOIN "Customers" c ON wo."customerId" = c.id
        WHERE wo."companyId" = $1
        ORDER BY wo."createdAt" DESC
      `;
      params = [req.user.companyId];
    }
    const result = await pool.query(query, params);
    res.json({ workOrders: result.rows });
  } catch (err) {
    console.error('GET work-orders error:', err.message);
    res.status(500).json({ message: 'Failed to load work orders' });
  }
});

app.post('/api/work-orders', requireAuth, async (req, res) => {
  const { customerId, jobType, description, priority, scheduledDate, scheduledTime, assignedTo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "WorkOrders" ("customerId", "jobType", description, priority, "scheduledDate", "scheduledTime", status, "companyId", "assignedTo")
       VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8) RETURNING *`,
      [customerId, jobType, description, priority || 'normal', scheduledDate || null, scheduledTime || null, req.user.companyId, assignedTo || null]
    );
    res.json({ message: 'Work order created', workOrder: result.rows[0] });
  } catch (err) {
    console.error('POST work-order error:', err.message);
    res.status(500).json({ message: 'Failed to create work order' });
  }
});

app.patch('/api/work-orders/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE "WorkOrders" SET status=$1, "updatedAt"=NOW() WHERE id=$2 AND "companyId"=$3 RETURNING *',
      [status, req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    res.json({ message: 'Status updated', workOrder: result.rows[0] });
  } catch (err) {
    console.error('PATCH work-order status error:', err.message);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

app.put('/api/work-orders/:id', requireAuth, async (req, res) => {
  const { customerId, jobType, description, priority, scheduledDate, scheduledTime, status, assignedTo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "WorkOrders" SET "customerId"=$1, "jobType"=$2, description=$3, priority=$4,
       "scheduledDate"=$5, "scheduledTime"=$6, status=$7, "assignedTo"=$8, "updatedAt"=NOW()
       WHERE id=$9 AND "companyId"=$10 RETURNING *`,
      [customerId, jobType, description, priority, scheduledDate || null, scheduledTime || null, status, assignedTo || null, req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    res.json({ message: 'Work order updated', workOrder: result.rows[0] });
  } catch (err) {
    console.error('PUT work-order error:', err.message);
    res.status(500).json({ message: 'Failed to update work order' });
  }
});

app.delete('/api/work-orders/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM "WorkOrders" WHERE id=$1 AND "companyId"=$2 RETURNING *',
      [req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    res.json({ message: 'Work order deleted' });
  } catch (err) {
    console.error('DELETE work-order error:', err.message);
    res.status(500).json({ message: 'Failed to delete work order' });
  }
});

// ─── INVOICES ─────────────────────────────────────────────

app.get('/api/invoices', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT inv.*, c."firstName", c."lastName"
      FROM "Invoices" inv
      LEFT JOIN "Customers" c ON inv."customerId" = c.id
      WHERE inv."companyId" = $1
      ORDER BY inv."createdAt" DESC
    `, [req.user.companyId]);
    res.json({ invoices: result.rows });
  } catch (err) {
    console.error('GET invoices error:', err.message);
    res.status(500).json({ message: 'Failed to load invoices' });
  }
});

app.post('/api/invoices', requireAuth, async (req, res) => {
  const { workOrderId, customerId, lineItems, subtotal, taxRate, taxAmount, total } = req.body;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  try {
    const result = await pool.query(
      `INSERT INTO "Invoices" ("invoiceNumber", "workOrderId", "customerId", "lineItems", subtotal, "taxRate", "taxAmount", total, status, "companyId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unpaid', $9) RETURNING *`,
      [invoiceNumber, workOrderId || null, customerId, JSON.stringify(lineItems), subtotal, taxRate, taxAmount, total, req.user.companyId]
    );
    res.json({ message: 'Invoice created', invoice: result.rows[0] });
  } catch (err) {
    console.error('POST invoice error:', err.message);
    res.status(500).json({ message: 'Failed to create invoice' });
  }
});

app.patch('/api/invoices/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE "Invoices" SET status=$1, "updatedAt"=NOW() WHERE id=$2 AND "companyId"=$3 RETURNING *',
      [status, req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice status updated', invoice: result.rows[0] });
  } catch (err) {
    console.error('PATCH invoice status error:', err.message);
    res.status(500).json({ message: 'Failed to update invoice status' });
  }
});

app.delete('/api/invoices/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM "Invoices" WHERE id=$1 AND "companyId"=$2 RETURNING *',
      [req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    console.error('DELETE invoice error:', err.message);
    res.status(500).json({ message: 'Failed to delete invoice' });
  }
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log('Database: PostgreSQL (hvac_field_os)');
  console.log('Auth: JWT + Multi-tenant enabled');
  console.log('========================================');
});
