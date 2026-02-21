require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/app/uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Images only'));
  },
});

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

app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use('/uploads', express.static('/app/uploads'));

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
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, companyId: user.companyId },
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
    const existing = await client.query('SELECT id FROM "Users" WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Email already in use' });
    }
    const stripeCustomer = await stripe.customers.create({ email: companyEmail || email, name: companyName });
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    const companyResult = await client.query(
      `INSERT INTO "Companies" (name, email, phone, plan, "stripeCustomerId", "trialEndsAt", active, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'trial', $4, $5, true, NOW(), NOW()) RETURNING *`,
      [companyName, companyEmail || email, companyPhone || null, stripeCustomer.id, trialEndsAt]
    );
    const company = companyResult.rows[0];
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

// ─── PASSWORD RESET ───────────────────────────────────────

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const userResult = await pool.query('SELECT * FROM "Users" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    await pool.query(
      'INSERT INTO "PasswordResets" (email, token, "expiresAt") VALUES ($1, $2, $3)',
      [email, token, expiresAt]
    );
    const resetUrl = `http://localhost:3001?reset=${token}`;
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Reset your HVAC Field OS password',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:Segoe UI,sans-serif;">
        <div style="max-width:500px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:#0f172a;padding:32px;text-align:center;">
            <h1 style="margin:0;color:white;font-size:24px;font-weight:700;">❄️ HVAC Field OS</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#1a2332;font-size:20px;">Reset Your Password</h2>
            <p style="color:#475569;font-size:15px;margin:0 0 24px;">Click the button below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display:block;text-align:center;padding:14px 32px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Reset Password</a>
            <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;text-align:center;">If you did not request this, ignore this email.</p>
          </div>
        </div>
        </body></html>`,
    });
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'Failed to send reset email' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  try {
    const resetResult = await pool.query(
      'SELECT * FROM "PasswordResets" WHERE token = $1 AND used = false AND "expiresAt" > NOW()',
      [token]
    );
    if (resetResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }
    const reset = resetResult.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE "Users" SET password = $1, "updatedAt" = NOW() WHERE email = $2', [hashedPassword, reset.email]);
    await pool.query('UPDATE "PasswordResets" SET used = true WHERE token = $1', [token]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// ─── BILLING ─────────────────────────────────────────────

app.get('/api/billing/plans', (req, res) => {
  res.json({
    plans: [
      { id: 'basic', name: 'Basic', price: 79, priceId: process.env.BASIC_PRICE_ID, description: 'Perfect for small HVAC companies', features: ['Up to 3 users', 'Customers & Work Orders', 'Invoicing', 'Email support'] },
      { id: 'pro', name: 'Pro', price: 149, priceId: process.env.PRO_PRICE_ID, description: 'For growing HVAC businesses', features: ['Unlimited users', 'All Basic features', 'Advanced dashboard', 'Priority support'], popular: true },
      { id: 'enterprise', name: 'Enterprise', price: 299, priceId: process.env.ENTERPRISE_PRICE_ID, description: 'For large operations', features: ['Everything in Pro', 'Custom integrations', 'Dedicated support', 'SLA guarantee'] },
    ],
  });
});

app.post('/api/billing/checkout', requireAuth, requireAdmin, async (req, res) => {
  const { priceId } = req.body;
  try {
    const companyResult = await pool.query('SELECT * FROM "Companies" WHERE id = $1', [req.user.companyId]);
    const company = companyResult.rows[0];
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: company.email, name: company.name });
      customerId = customer.id;
      await pool.query('UPDATE "Companies" SET "stripeCustomerId" = $1 WHERE id = $2', [customerId, company.id]);
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `http://localhost:3001?billing=success`,
      cancel_url: `http://localhost:3001?billing=cancelled`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ message: 'Failed to create checkout session' });
  }
});

app.post('/api/billing/portal', requireAuth, requireAdmin, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT * FROM "Companies" WHERE id = $1', [req.user.companyId]);
    const company = companyResult.rows[0];
    if (!company.stripeCustomerId) return res.status(400).json({ message: 'No billing account found' });
    const session = await stripe.billingPortal.sessions.create({ customer: company.stripeCustomerId, return_url: 'http://localhost:3001' });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err.message);
    res.status(500).json({ message: 'Failed to open billing portal' });
  }
});

app.get('/api/billing/status', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Companies" WHERE id = $1', [req.user.companyId]);
    const company = result.rows[0];
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const now = new Date();
    const trialEndsAt = company.trialEndsAt ? new Date(company.trialEndsAt) : null;
    const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24))) : 0;
    const trialExpired = trialEndsAt ? now > trialEndsAt : false;
    const isActive = company.plan !== 'trial' || !trialExpired;
    res.json({ plan: company.plan, active: isActive, trialEndsAt: company.trialEndsAt, trialDaysLeft, trialExpired, stripeCustomerId: company.stripeCustomerId });
  } catch (err) {
    console.error('Billing status error:', err.message);
    res.status(500).json({ message: 'Failed to get billing status' });
  }
});

app.post('/api/billing/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0].price.id;
        let plan = 'basic';
        if (priceId === process.env.PRO_PRICE_ID) plan = 'pro';
        if (priceId === process.env.ENTERPRISE_PRICE_ID) plan = 'enterprise';
        await pool.query('UPDATE "Companies" SET plan=$1, "stripeSubscriptionId"=$2, active=true, "updatedAt"=NOW() WHERE "stripeCustomerId"=$3', [plan, subscription.id, session.customer]);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await pool.query('UPDATE "Companies" SET plan=\'trial\', "stripeSubscriptionId"=NULL, active=false, "updatedAt"=NOW() WHERE "stripeCustomerId"=$1', [subscription.customer]);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await pool.query('UPDATE "Companies" SET active=false, "updatedAt"=NOW() WHERE "stripeCustomerId"=$1', [invoice.customer]);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await pool.query('UPDATE "Companies" SET active=true, "updatedAt"=NOW() WHERE "stripeCustomerId"=$1', [invoice.customer]);
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ message: 'Webhook handler failed' });
  }
});

// ─── COMPANIES ───────────────────────────────────────────

app.get('/api/company', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Companies" WHERE id = $1', [req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Company not found' });
    res.json({ company: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load company' });
  }
});

app.put('/api/company', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, phone, address } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "Companies" SET name=$1, email=$2, phone=$3, address=$4, "updatedAt"=NOW() WHERE id=$5 RETURNING *`,
      [name, email, phone, address, req.user.companyId]
    );
    res.json({ company: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update company' });
  }
});

// ─── USERS ───────────────────────────────────────────────

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, "firstName", "lastName", email, role, "companyId", "createdAt" FROM "Users" WHERE "companyId" = $1 ORDER BY "createdAt" DESC',
      [req.user.companyId]
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load users' });
  }
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  if (!firstName || !lastName || !email || !password) return res.status(400).json({ message: 'All fields are required' });
  try {
    const existing = await pool.query('SELECT id FROM "Users" WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Email already in use' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO "Users" ("firstName", "lastName", email, password, role, "companyId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, "firstName", "lastName", email, role, "companyId", "createdAt"`,
      [firstName, lastName, email, hashedPassword, role || 'technician', req.user.companyId]
    );
    res.json({ message: 'User created', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create user' });
  }
});

app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { firstName, lastName, email, role, password } = req.body;
  try {
    let query, params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `UPDATE "Users" SET "firstName"=$1, "lastName"=$2, email=$3, role=$4, password=$5, "updatedAt"=NOW() WHERE id=$6 AND "companyId"=$7 RETURNING id, "firstName", "lastName", email, role`;
      params = [firstName, lastName, email, role, hashedPassword, req.params.id, req.user.companyId];
    } else {
      query = `UPDATE "Users" SET "firstName"=$1, "lastName"=$2, email=$3, role=$4, "updatedAt"=NOW() WHERE id=$5 AND "companyId"=$6 RETURNING id, "firstName", "lastName", email, role`;
      params = [firstName, lastName, email, role, req.params.id, req.user.companyId];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account' });
  try {
    const result = await pool.query('DELETE FROM "Users" WHERE id=$1 AND "companyId"=$2 RETURNING *', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ─── CUSTOMERS ───────────────────────────────────────────

app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Customers" WHERE "companyId" = $1 ORDER BY "createdAt" DESC', [req.user.companyId]);
    res.json({ customers: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load customers' });
  }
});

app.post('/api/customers', requireAuth, async (req, res) => {
  const { firstName, lastName, phone, email, address } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "Customers" ("firstName", "lastName", phone, email, address, "companyId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [firstName, lastName, phone, email, address, req.user.companyId]
    );
    res.json({ message: 'Customer created', customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

app.put('/api/customers/:id', requireAuth, async (req, res) => {
  const { firstName, lastName, phone, email, address } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "Customers" SET "firstName"=$1, "lastName"=$2, phone=$3, email=$4, address=$5, "updatedAt"=NOW() WHERE id=$6 AND "companyId"=$7 RETURNING *`,
      [firstName, lastName, phone, email, address, req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer updated', customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM "Customers" WHERE id=$1 AND "companyId"=$2 RETURNING *', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

app.get('/api/customers/:id/jobs', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "WorkOrders" WHERE "customerId"=$1 AND "companyId"=$2 ORDER BY "createdAt" DESC', [req.params.id, req.user.companyId]);
    res.json({ jobs: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load jobs' });
  }
});

// ─── WORK ORDERS ─────────────────────────────────────────

app.get('/api/work-orders', requireAuth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'technician') {
      query = `SELECT wo.*, c."firstName", c."lastName" FROM "WorkOrders" wo LEFT JOIN "Customers" c ON wo."customerId" = c.id WHERE wo."companyId" = $1 AND wo."assignedTo" = $2 ORDER BY wo."createdAt" DESC`;
      params = [req.user.companyId, req.user.id];
    } else {
      query = `SELECT wo.*, c."firstName", c."lastName" FROM "WorkOrders" wo LEFT JOIN "Customers" c ON wo."customerId" = c.id WHERE wo."companyId" = $1 ORDER BY wo."createdAt" DESC`;
      params = [req.user.companyId];
    }
    const result = await pool.query(query, params);
    res.json({ workOrders: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load work orders' });
  }
});

app.post('/api/work-orders', requireAuth, async (req, res) => {
  const { customerId, jobType, description, priority, scheduledDate, scheduledTime, assignedTo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "WorkOrders" ("customerId", "jobType", description, priority, "scheduledDate", "scheduledTime", status, "companyId", "assignedTo") VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8) RETURNING *`,
      [customerId, jobType, description, priority || 'normal', scheduledDate || null, scheduledTime || null, req.user.companyId, assignedTo || null]
    );
    res.json({ message: 'Work order created', workOrder: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create work order' });
  }
});

app.patch('/api/work-orders/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query('UPDATE "WorkOrders" SET status=$1, "updatedAt"=NOW() WHERE id=$2 AND "companyId"=$3 RETURNING *', [status, req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    res.json({ message: 'Status updated', workOrder: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

app.put('/api/work-orders/:id', requireAuth, async (req, res) => {
  const { customerId, jobType, description, priority, scheduledDate, scheduledTime, status, assignedTo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "WorkOrders" SET "customerId"=$1, "jobType"=$2, description=$3, priority=$4, "scheduledDate"=$5, "scheduledTime"=$6, status=$7, "assignedTo"=$8, "updatedAt"=NOW() WHERE id=$9 AND "companyId"=$10 RETURNING *`,
      [customerId, jobType, description, priority, scheduledDate || null, scheduledTime || null, status, assignedTo || null, req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    res.json({ message: 'Work order updated', workOrder: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update work order' });
  }
});

app.delete('/api/work-orders/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM "WorkOrders" WHERE id=$1 AND "companyId"=$2 RETURNING *', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    res.json({ message: 'Work order deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete work order' });
  }
});

// ─── INVOICES ────────────────────────────────────────────

app.get('/api/invoices', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT inv.*, c."firstName", c."lastName" FROM "Invoices" inv LEFT JOIN "Customers" c ON inv."customerId" = c.id WHERE inv."companyId" = $1 ORDER BY inv."createdAt" DESC`, [req.user.companyId]);
    res.json({ invoices: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load invoices' });
  }
});

app.post('/api/invoices', requireAuth, async (req, res) => {
  const { workOrderId, customerId, lineItems, subtotal, taxRate, taxAmount, total } = req.body;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  try {
    const result = await pool.query(
      `INSERT INTO "Invoices" ("invoiceNumber", "workOrderId", "customerId", "lineItems", subtotal, "taxRate", "taxAmount", total, status, "companyId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unpaid', $9) RETURNING *`,
      [invoiceNumber, workOrderId || null, customerId, JSON.stringify(lineItems), subtotal, taxRate, taxAmount, total, req.user.companyId]
    );
    res.json({ message: 'Invoice created', invoice: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create invoice' });
  }
});

app.patch('/api/invoices/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query('UPDATE "Invoices" SET status=$1, "updatedAt"=NOW() WHERE id=$2 AND "companyId"=$3 RETURNING *', [status, req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice status updated', invoice: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update invoice status' });
  }
});

app.delete('/api/invoices/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM "Invoices" WHERE id=$1 AND "companyId"=$2 RETURNING *', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete invoice' });
  }
});

// ─── EMAIL INVOICE ────────────────────────────────────────

app.post('/api/invoices/:id/email', requireAuth, async (req, res) => {
  try {
    const invoiceResult = await pool.query(`
      SELECT inv.*, c."firstName", c."lastName", c.email as "customerEmail",
             co.name as "companyName", co.email as "companyEmail", co.phone as "companyPhone"
      FROM "Invoices" inv
      LEFT JOIN "Customers" c ON inv."customerId" = c.id
      LEFT JOIN "Companies" co ON inv."companyId" = co.id
      WHERE inv.id = $1 AND inv."companyId" = $2
    `, [req.params.id, req.user.companyId]);

    if (invoiceResult.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    const inv = invoiceResult.rows[0];
    if (!inv.customerEmail) return res.status(400).json({ message: 'Customer has no email address' });

    const lineItems = Array.isArray(inv.lineItems) ? inv.lineItems : JSON.parse(inv.lineItems || '[]');
    const lineItemsHtml = lineItems.map(item => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#475569;">${item.description || item.name || 'Service'}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#475569;text-align:center;">${item.quantity || 1}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#475569;text-align:right;">$${parseFloat(item.unitPrice || item.price || 0).toFixed(2)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#1a2332;font-weight:600;text-align:right;">$${parseFloat(item.total || (item.quantity * item.unitPrice) || 0).toFixed(2)}</td>
      </tr>`).join('');

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Segoe UI,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0f172a;padding:32px;text-align:center;">
    <h1 style="margin:0;color:white;font-size:24px;font-weight:700;">❄️ ${inv.companyName}</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Invoice ${inv.invoiceNumber}</p>
  </div>
  <div style="background:${inv.status === 'paid' ? '#f0fdf4' : '#fffbeb'};padding:16px 32px;text-align:center;border-bottom:1px solid ${inv.status === 'paid' ? '#86efac' : '#fde68a'};">
    <span style="font-weight:700;color:${inv.status === 'paid' ? '#15803d' : '#92400e'};font-size:14px;text-transform:uppercase;letter-spacing:1px;">${inv.status === 'paid' ? '✅ PAID' : '⏳ PAYMENT DUE'}</span>
  </div>
  <div style="padding:32px;">
    <p style="margin:0 0 24px;color:#475569;font-size:15px;">Hi ${inv.firstName},<br><br>Please find your invoice from <strong>${inv.companyName}</strong> below.</p>
    <div style="display:flex;justify-content:space-between;margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:8px;">
      <div><p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Invoice Number</p><p style="margin:0;font-size:15px;color:#1a2332;font-weight:700;">${inv.invoiceNumber}</p></div>
      <div style="text-align:right;"><p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Date</p><p style="margin:0;font-size:15px;color:#1a2332;font-weight:700;">${new Date(inv.createdAt).toLocaleDateString()}</p></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead><tr style="background:#f8fafc;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Description</th>
        <th style="padding:10px 16px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Qty</th>
        <th style="padding:10px 16px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Unit Price</th>
        <th style="padding:10px 16px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Total</th>
      </tr></thead>
      <tbody>${lineItemsHtml}</tbody>
    </table>
    <div style="border-top:2px solid #e2e8f0;padding-top:16px;margin-bottom:32px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:14px;">Subtotal</span><span style="color:#1a2332;font-size:14px;">$${parseFloat(inv.subtotal||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;"><span style="color:#64748b;font-size:14px;">Tax (${parseFloat(inv.taxRate||0)}%)</span><span style="color:#1a2332;font-size:14px;">$${parseFloat(inv.taxAmount||0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:12px 16px;background:#0f172a;border-radius:8px;"><span style="color:white;font-size:16px;font-weight:700;">Total Due</span><span style="color:white;font-size:20px;font-weight:800;">$${parseFloat(inv.total||0).toFixed(2)}</span></div>
    </div>
    <div style="padding:16px;background:#f8fafc;border-radius:8px;text-align:center;">
      <p style="margin:0 0 4px;color:#475569;font-size:14px;">Questions? Contact us:</p>
      <p style="margin:0;color:#2563eb;font-size:14px;font-weight:600;">${inv.companyEmail||''} ${inv.companyPhone ? '| '+inv.companyPhone : ''}</p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">Powered by HVAC Field OS</p>
  </div>
</div>
</body></html>`;

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: inv.customerEmail,
      subject: `Invoice ${inv.invoiceNumber} from ${inv.companyName} — $${parseFloat(inv.total).toFixed(2)}`,
      html: emailHtml,
    });

    await pool.query('UPDATE "Invoices" SET "emailedAt"=NOW(), "updatedAt"=NOW() WHERE id=$1', [inv.id]);
    res.json({ message: 'Invoice emailed successfully' });
  } catch (err) {
    console.error('Email invoice error:', err.message);
    res.status(500).json({ message: 'Failed to send email: ' + err.message });
  }
});

// ─── PHOTO UPLOADS ───────────────────────────────────────

app.post('/api/work-orders/:id/photos', requireAuth, upload.array('photos', 10), async (req, res) => {
  try {
    const woResult = await pool.query('SELECT * FROM "WorkOrders" WHERE id=$1 AND "companyId"=$2', [req.params.id, req.user.companyId]);
    if (woResult.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    const wo = woResult.rows[0];
    const existingPhotos = wo.photos || [];
    const newPhotos = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      url: `/uploads/${f.filename}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user.id,
    }));
    const allPhotos = [...existingPhotos, ...newPhotos];
    await pool.query('UPDATE "WorkOrders" SET photos=$1, "updatedAt"=NOW() WHERE id=$2', [JSON.stringify(allPhotos), req.params.id]);
    res.json({ message: 'Photos uploaded', photos: allPhotos });
  } catch (err) {
    console.error('Photo upload error:', err.message);
    res.status(500).json({ message: 'Failed to upload photos' });
  }
});

app.delete('/api/work-orders/:id/photos/:filename', requireAuth, async (req, res) => {
  try {
    const woResult = await pool.query('SELECT * FROM "WorkOrders" WHERE id=$1 AND "companyId"=$2', [req.params.id, req.user.companyId]);
    if (woResult.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    const wo = woResult.rows[0];
    const photos = (wo.photos || []).filter(p => p.filename !== req.params.filename);
    await pool.query('UPDATE "WorkOrders" SET photos=$1, "updatedAt"=NOW() WHERE id=$2', [JSON.stringify(photos), req.params.id]);
    const filePath = `/app/uploads/${req.params.filename}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: 'Photo deleted', photos });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete photo' });
  }
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log('Database: PostgreSQL (hvac_field_os)');
  console.log('Auth: JWT + Multi-tenant enabled');
  console.log('Billing: Stripe enabled');
  console.log('Email: Resend enabled');
  console.log('========================================');
});
