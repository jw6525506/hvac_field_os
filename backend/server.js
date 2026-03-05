require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const multer = require('multer');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// ─── VALIDATION HELPER ────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

const sanitize = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const clean = {};
  for (const key of Object.keys(obj)) {
    clean[key] = typeof obj[key] === 'string' ? obj[key].trim() : obj[key];
  }
  return clean;
};

const path = require('path');
const fs = require('fs');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset attempts. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 }
    : {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'Helix8',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password123',
        port: 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use('/uploads', express.static('/app/uploads'));
app.use(generalLimiter);

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

app.post('/api/auth/login', loginLimiter, [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
], validate, async (req, res) => {
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

app.post('/api/auth/register-company', [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*[0-9])/).withMessage('Password must contain uppercase letter and number'),
  body('companyName').notEmpty().withMessage('Company name required').isLength({ max: 100 }),
  body('firstName').notEmpty().withMessage('First name required').isLength({ max: 50 }),
  body('lastName').notEmpty().withMessage('Last name required').isLength({ max: 50 }),
], validate, async (req, res) => {
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

app.post('/api/auth/forgot-password', forgotLimiter, async (req, res) => {
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
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}?reset=${token}`;
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Reset your Helix8 password',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:Segoe UI,sans-serif;">
        <div style="max-width:500px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:#0f172a;padding:32px;text-align:center;">
            <h1 style="margin:0;color:white;font-size:24px;font-weight:700;">❄️ Helix8</h1>
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
      { id: 'basic', name: 'Basic', price: 79, priceId: process.env.BASIC_PRICE_ID, description: 'Everything you need to get started', features: ['Up to 3 users', 'Customers & Work Orders', 'Invoicing', 'Email support'] },
      { id: 'pro', name: 'Pro', price: 149, priceId: process.env.PRO_PRICE_ID, description: 'Scale your operation with confidence', features: ['Unlimited users', 'All Basic features', 'Advanced dashboard', 'Priority support'], popular: true },
      { id: 'enterprise', name: 'Enterprise', price: 299, priceId: process.env.ENTERPRISE_PRICE_ID, description: 'Built for high-volume teams', features: ['Everything in Pro', 'Custom integrations', 'Dedicated support', 'SLA guarantee'] },
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
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}?billing=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}?billing=cancelled`,
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
    const session = await stripe.billingPortal.sessions.create({ customer: company.stripeCustomerId, return_url: process.env.FRONTEND_URL || 'http://localhost:3001' });
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
    await pool.query('UPDATE "WorkOrders" SET "assignedTo" = NULL WHERE "assignedTo" = $1 AND "companyId" = $2', [req.params.id, req.user.companyId]);
    await pool.query('UPDATE "Inventory" SET "assignedTo" = NULL WHERE "assignedTo" = $1 AND "companyId" = $2', [req.params.id, req.user.companyId]);
    const result = await pool.query('DELETE FROM "Users" WHERE id=$1 AND "companyId"=$2 RETURNING *', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ message: 'Failed to delete user: ' + err.message });
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

app.post('/api/customers', requireAuth, [
  body('firstName').notEmpty().withMessage('First name required').isLength({ max: 50 }),
  body('lastName').notEmpty().withMessage('Last name required').isLength({ max: 50 }),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().isLength({ max: 20 }),
], validate, async (req, res) => {
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

app.post('/api/work-orders', requireAuth, [
  body('customerId').notEmpty().withMessage('Customer required'),
  body('jobType').notEmpty().withMessage('Job type required'),
], validate, async (req, res) => {
  const { customerId, jobType, description, priority, scheduledDate, scheduledTime, assignedTo, title } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "WorkOrders" (title, "customerId", "jobType", description, priority, "scheduledDate", "scheduledTime", status, "companyId", "assignedTo") VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8, $9) RETURNING *`,
      [title || jobType || 'Work Order', customerId, jobType, description, priority || 'normal', scheduledDate || null, scheduledTime || null, req.user.companyId, assignedTo || null]
    );
    res.json({ message: 'Work order created', workOrder: result.rows[0] });
  } catch (err) {
    console.error('Work order error:', err.message);
    res.status(500).json({ message: 'Failed to create work order', error: err.message });
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
    // Clear any invoice references first
    await pool.query('UPDATE "Invoices" SET "workOrderId" = NULL WHERE "workOrderId" = $1 AND "companyId" = $2', [req.params.id, req.user.companyId]);
    const result = await pool.query('DELETE FROM "WorkOrders" WHERE id=$1 AND "companyId"=$2 RETURNING *', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    res.json({ message: 'Work order deleted' });
  } catch (err) {
    console.error('Delete work order error:', err.message);
    res.status(500).json({ message: 'Failed to delete work order: ' + err.message });
  }
});


// Before/After photo upload
app.post('/api/work-orders/:id/before-photos', requireAuth, upload.array('photos', 10), async (req, res) => {
  try {
    const result = await pool.query('SELECT "beforePhotos" FROM "WorkOrders" WHERE id=$1 AND "companyId"=$2', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const existing = result.rows[0].beforePhotos || [];
    const newPhotos = req.files.map(f => '/uploads/' + f.filename);
    const all = [...existing, ...newPhotos];
    await pool.query('UPDATE "WorkOrders" SET "beforePhotos"=$1, "updatedAt"=NOW() WHERE id=$2', [all, req.params.id]);
    res.json({ beforePhotos: all });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.post('/api/work-orders/:id/after-photos', requireAuth, upload.array('photos', 10), async (req, res) => {
  try {
    const result = await pool.query('SELECT "afterPhotos" FROM "WorkOrders" WHERE id=$1 AND "companyId"=$2', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const existing = result.rows[0].afterPhotos || [];
    const newPhotos = req.files.map(f => '/uploads/' + f.filename);
    const all = [...existing, ...newPhotos];
    await pool.query('UPDATE "WorkOrders" SET "afterPhotos"=$1, "updatedAt"=NOW() WHERE id=$2', [all, req.params.id]);
    res.json({ afterPhotos: all });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.delete('/api/work-orders/:id/before-photos/:filename', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT "beforePhotos" FROM "WorkOrders" WHERE id=$1 AND "companyId"=$2', [req.params.id, req.user.companyId]);
    const photos = (result.rows[0].beforePhotos || []).filter(p => !p.includes(req.params.filename));
    await pool.query('UPDATE "WorkOrders" SET "beforePhotos"=$1, "updatedAt"=NOW() WHERE id=$2', [photos, req.params.id]);
    res.json({ beforePhotos: photos });
  } catch (err) { res.status(500).json({ message: 'Delete failed' }); }
});

app.delete('/api/work-orders/:id/after-photos/:filename', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT "afterPhotos" FROM "WorkOrders" WHERE id=$1 AND "companyId"=$2', [req.params.id, req.user.companyId]);
    const photos = (result.rows[0].afterPhotos || []).filter(p => !p.includes(req.params.filename));
    await pool.query('UPDATE "WorkOrders" SET "afterPhotos"=$1, "updatedAt"=NOW() WHERE id=$2', [photos, req.params.id]);
    res.json({ afterPhotos: photos });
  } catch (err) { res.status(500).json({ message: 'Delete failed' }); }
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

app.post('/api/invoices', requireAuth, [
  body('customerId').notEmpty().withMessage('Customer required'),
  body('total').isFloat({ min: 0 }).withMessage('Valid total required'),
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item required'),
], validate, async (req, res) => {
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
    ${inv.status !== 'paid' ? `<div style="text-align:center;margin-bottom:24px;">
      <a href="${process.env.FRONTEND_URL || 'https://cheerful-love-production.up.railway.app'}/pay/${inv.id}" 
         style="display:inline-block;padding:16px 48px;background:#06b6d4;color:#0a0f2c;font-size:18px;font-weight:800;text-decoration:none;border-radius:8px;">
        💳 Pay Now
      </a>
    </div>` : ''}
    <div style="padding:16px;background:#f8fafc;border-radius:8px;text-align:center;">
      <p style="margin:0 0 4px;color:#475569;font-size:14px;">Questions? Contact us:</p>
      <p style="margin:0;color:#2563eb;font-size:14px;font-weight:600;">${inv.companyEmail||''} ${inv.companyPhone ? '| '+inv.companyPhone : ''}</p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">Powered by Helix8</p>
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






// ─── CONTACT FORM ────────────────────────────────────────

app.post('/api/contact', async (req, res) => {
  const { name, email, company, phone, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ message: 'Name, email and message are required' });
  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Helix8 Contact <onboarding@resend.dev>',
      to: 'Washington.j3@icloud.com',
      subject: `New Contact Form: ${name} from ${company || 'Unknown Company'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; color: #0a0f2c;">Helix<span style="color: #06b6d4;">8</span> — New Lead</h1>
          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p style="margin: 0 0 12px;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 0 0 12px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 0 0 12px;"><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p style="margin: 0 0 12px;"><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p style="margin: 0;"><strong>Message:</strong><br/>${message}</p>
          </div>
          <p style="color: #64748b; font-size: 13px;">Reply directly to this email to respond to ${name}.</p>
        </div>
      `,
      replyTo: email
    });
    res.json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Contact form error:', err.message);
    res.status(500).json({ message: 'Failed to send message' });
  }
});






// ─── MANUALS ────────────────────────────────────────────


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.get('/api/manuals', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "Manuals" WHERE "companyId"=$1 ORDER BY brand, model ASC',
      [req.user.companyId]
    );
    res.json({ manuals: result.rows });
  } catch (err) {
    console.error('Get manuals error:', err.message);
    res.status(500).json({ message: 'Failed to load manuals' });
  }
});

app.post('/api/manuals', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { brand, model, industry, docType, description } = req.body;

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'raw', folder: 'helix8-manuals', format: 'pdf', public_id: `${brand}-${model}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '-') },
        (error, result) => error ? reject(error) : resolve(result)
      ).end(req.file.buffer);
    });

    const result = await pool.query(
      `INSERT INTO "Manuals" (brand, model, industry, "docType", description, "fileUrl", "publicId", "companyId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`,
      [brand, model, industry, docType, description, uploadResult.secure_url, uploadResult.public_id, req.user.companyId]
    );
    res.json({ manual: result.rows[0] });
  } catch (err) {
    console.error('Upload manual error:', err.message);
    res.status(500).json({ message: 'Failed to upload manual' });
  }
});

app.delete('/api/manuals/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Manuals" WHERE id=$1 AND "companyId"=$2', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const manual = result.rows[0];
    if (manual.publicId) await cloudinary.uploader.destroy(manual.publicId, { resource_type: 'raw' });
    await pool.query('DELETE FROM "Manuals" WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete' });
  }
});

// ─── MAINTENANCE PLANS ────────────────────────────────────

app.get('/api/maintenance/plans', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "MaintenancePlans" WHERE "companyId"=$1 ORDER BY price ASC', [req.user.companyId]);
    res.json({ plans: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load plans' });
  }
});

app.post('/api/maintenance/plans', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, interval, visits, features } = req.body;
    const result = await pool.query(
      `INSERT INTO "MaintenancePlans" (name, description, price, interval, visits, features, "companyId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING *`,
      [name, description, price, interval || 'monthly', visits || 2, features, req.user.companyId]
    );
    res.json({ plan: result.rows[0] });
  } catch (err) {
    console.error('Create plan error:', err.message);
    res.status(500).json({ message: 'Failed to create plan' });
  }
});

app.get('/api/maintenance/subscriptions', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ms.*, c."firstName" as "customerFirstName", c."lastName" as "customerLastName",
        mp.name as "planName", mp.price as "planPrice", mp.interval as "planInterval", mp.visits
      FROM "MaintenanceSubscriptions" ms
      LEFT JOIN "Customers" c ON ms."customerId"=c.id
      LEFT JOIN "MaintenancePlans" mp ON ms."planId"=mp.id
      WHERE ms."companyId"=$1
      ORDER BY ms."createdAt" DESC
    `, [req.user.companyId]);
    res.json({ subscriptions: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load subscriptions' });
  }
});

app.post('/api/maintenance/subscriptions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { customerId, planId, startDate, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO "MaintenanceSubscriptions" ("customerId", "planId", "companyId", "startDate", notes, status, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,'active',NOW(),NOW()) RETURNING *`,
      [customerId, planId, req.user.companyId, startDate, notes]
    );
    res.json({ subscription: result.rows[0] });
  } catch (err) {
    console.error('Create subscription error:', err.message);
    res.status(500).json({ message: 'Failed to create subscription' });
  }
});

app.patch('/api/maintenance/subscriptions/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE "MaintenanceSubscriptions" SET status=$1, "updatedAt"=NOW() WHERE id=$2 AND "companyId"=$3', [status, req.params.id, req.user.companyId]);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update' });
  }
});

// ─── ESTIMATES ────────────────────────────────────────────

app.get('/api/estimates', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, c."firstName" as "customerFirstName", c."lastName" as "customerLastName"
      FROM "Estimates" e
      LEFT JOIN "Customers" c ON e."customerId"=c.id
      WHERE e."companyId"=$1
      ORDER BY e."createdAt" DESC
    `, [req.user.companyId]);
    res.json({ estimates: result.rows });
  } catch (err) {
    console.error('Get estimates error:', err.message);
    res.status(500).json({ message: 'Failed to load estimates' });
  }
});

app.post('/api/estimates', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { customerId, title, description, lineItems, subtotal, taxRate, taxAmount, total, validDays, notes } = req.body;
    const estimateNumber = 'EST-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000)+1000);
    const result = await pool.query(`
      INSERT INTO "Estimates" ("estimateNumber", "customerId", "companyId", title, description, "lineItems", subtotal, "taxRate", "taxAmount", total, "validDays", notes, status, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',NOW(),NOW()) RETURNING *
    `, [estimateNumber, customerId, req.user.companyId, title, description, JSON.stringify(lineItems), subtotal, taxRate, taxAmount, total, validDays || 30, notes]);
    res.json({ estimate: result.rows[0] });
  } catch (err) {
    console.error('Create estimate error:', err.message);
    res.status(500).json({ message: 'Failed to create estimate' });
  }
});

app.patch('/api/estimates/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query(`UPDATE "Estimates" SET status=$1, "updatedAt"=NOW() WHERE id=$2 AND "companyId"=$3`, [status, req.params.id, req.user.companyId]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

app.post('/api/estimates/:id/convert', requireAuth, requireAdmin, async (req, res) => {
  try {
    const estResult = await pool.query('SELECT * FROM "Estimates" WHERE id=$1 AND "companyId"=$2', [req.params.id, req.user.companyId]);
    if (estResult.rows.length === 0) return res.status(404).json({ message: 'Estimate not found' });
    const est = estResult.rows[0];
    const woResult = await pool.query(`
      INSERT INTO "WorkOrders" (title, "customerId", "jobType", description, priority, status, "companyId", "createdAt", "updatedAt")
      VALUES ($1,$2,'Estimate Conversion',$3,'normal','scheduled',$4,NOW(),NOW()) RETURNING *
    `, [est.title, est.customerId, est.description || est.title, req.user.companyId]);
    await pool.query("UPDATE \"Estimates\" SET status='converted', \"updatedAt\"=NOW() WHERE id=$1", [req.params.id]);
    res.json({ workOrder: woResult.rows[0] });
  } catch (err) {
    console.error('Convert estimate error:', err.message);
    res.status(500).json({ message: 'Failed to convert estimate' });
  }
});

// ─── PAYROLL / TIME CLOCK ────────────────────────────────

// Clock in
app.post('/api/timeclock/clockin', requireAuth, async (req, res) => {
  try {
    const { workOrderId } = req.body;
    const active = await pool.query('SELECT id FROM "TimeEntries" WHERE "userId"=$1 AND "clockOut" IS NULL', [req.user.id]);
    if (active.rows.length > 0) return res.status(400).json({ message: 'Already clocked in' });
    const result = await pool.query(
      'INSERT INTO "TimeEntries" ("userId", "workOrderId", "companyId", "clockIn") VALUES ($1,$2,$3,NOW()) RETURNING *',
      [req.user.id, workOrderId || null, req.user.companyId]
    );
    res.json({ message: 'Clocked in', entry: result.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Failed to clock in' }); }
});

// Clock out
app.post('/api/timeclock/clockout', requireAuth, async (req, res) => {
  try {
    const active = await pool.query('SELECT * FROM "TimeEntries" WHERE "userId"=$1 AND "clockOut" IS NULL', [req.user.id]);
    if (active.rows.length === 0) return res.status(400).json({ message: 'Not clocked in' });
    const entry = active.rows[0];
    const minutes = Math.round((Date.now() - new Date(entry.clockIn).getTime()) / 60000);
    const result = await pool.query(
      'UPDATE "TimeEntries" SET "clockOut"=NOW(), "totalMinutes"=$1, "updatedAt"=NOW() WHERE id=$2 RETURNING *',
      [minutes, entry.id]
    );
    res.json({ message: 'Clocked out', entry: result.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Failed to clock out' }); }
});

// Get current clock status
app.get('/api/timeclock/status', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT te.*, wo."jobType" FROM "TimeEntries" te LEFT JOIN "WorkOrders" wo ON te."workOrderId"=wo.id WHERE te."userId"=$1 AND te."clockOut" IS NULL', [req.user.id]);
    res.json({ clockedIn: result.rows.length > 0, entry: result.rows[0] || null });
  } catch (err) { res.status(500).json({ message: 'Failed to get status' }); }
});

// Get time entries for company
app.get('/api/timeclock/entries', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    let query = `SELECT te.*, u."firstName", u."lastName", u."hourlyRate", u."commissionRate", wo."jobType" 
      FROM "TimeEntries" te 
      LEFT JOIN "Users" u ON te."userId"=u.id 
      LEFT JOIN "WorkOrders" wo ON te."workOrderId"=wo.id 
      WHERE te."companyId"=$1`;
    const params = [req.user.companyId];
    if (userId) { params.push(userId); query += ` AND te."userId"=$${params.length}`; }
    if (startDate) { params.push(startDate); query += ` AND te."clockIn">=$${params.length}`; }
    if (endDate) { params.push(endDate); query += ` AND te."clockIn"<=$${params.length}`; }
    query += ' ORDER BY te."clockIn" DESC';
    const result = await pool.query(query, params);
    res.json({ entries: result.rows });
  } catch (err) { res.status(500).json({ message: 'Failed to load entries' }); }
});

// Get payroll summary
app.get('/api/payroll/summary', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const params = [req.user.companyId];
    let dateFilter = '';
    if (startDate) { params.push(startDate); dateFilter += ` AND te."clockIn">=$${params.length}`; }
    if (endDate) { params.push(endDate); dateFilter += ` AND te."clockIn"<=$${params.length}`; }

    const result = await pool.query(`
      SELECT u.id, u."firstName", u."lastName", u."hourlyRate", u."commissionRate",
        COALESCE(SUM(te."totalMinutes"),0) as "totalMinutes",
        COALESCE(SUM(te."totalMinutes")/60.0 * u."hourlyRate", 0) as "hourlyPay",
        COUNT(DISTINCT te.id) as "totalShifts"
      FROM "Users" u
      LEFT JOIN "TimeEntries" te ON u.id=te."userId" AND te."clockOut" IS NOT NULL ${dateFilter}
      WHERE u."companyId"=$1 AND u.role='technician'
      GROUP BY u.id, u."firstName", u."lastName", u."hourlyRate", u."commissionRate"
    `, params);

    const params2 = [req.user.companyId];
    let dateFilter2 = '';
    if (startDate) { params2.push(startDate); dateFilter2 += ` AND inv."createdAt">=$${params2.length}`; }
    if (endDate) { params2.push(endDate); dateFilter2 += ` AND inv."createdAt"<=$${params2.length}`; }

    const invoiceResult = await pool.query(`
      SELECT wo."assignedTo", COALESCE(SUM(inv.total),0) as "totalInvoiced"
      FROM "Invoices" inv
      JOIN "WorkOrders" wo ON inv."workOrderId"=wo.id
      WHERE inv."companyId"=$1 AND inv.status='paid' ${dateFilter2}
      GROUP BY wo."assignedTo"
    `, params2);

    const invoiceMap = {};
    invoiceResult.rows.forEach(r => { invoiceMap[r.assignedTo] = parseFloat(r.totalInvoiced); });

    const summary = result.rows.map(u => {
      const commissionBase = invoiceMap[u.id] || 0;
      const commissionPay = commissionBase * (parseFloat(u.commissionRate) / 100);
      const totalPay = parseFloat(u.hourlyPay) + commissionPay;
      return { ...u, commissionBase, commissionPay, totalPay };
    });

    res.json({ summary });
  } catch (err) {
    console.error('Payroll summary error:', err.message);
    res.status(500).json({ message: 'Failed to load payroll' });
  }
});

// Update technician pay rates
app.put('/api/users/:id/pay-rates', requireAuth, async (req, res) => {
  try {
    const { hourlyRate, commissionRate } = req.body;
    await pool.query('UPDATE "Users" SET "hourlyRate"=$1, "commissionRate"=$2, "updatedAt"=NOW() WHERE id=$3 AND "companyId"=$4',
      [hourlyRate, commissionRate, req.params.id, req.user.companyId]);
    res.json({ message: 'Pay rates updated' });
  } catch (err) { res.status(500).json({ message: 'Failed to update pay rates' }); }
});

// ─── PUBLIC INVOICE ROUTES ───────────────────────────────

app.get('/api/invoices/:id/public', async (req, res) => {
  try {
    const result = await pool.query(`SELECT inv.*, c."firstName", c."lastName", comp.name as "companyName", comp.email as "companyEmail", comp.phone as "companyPhone" FROM "Invoices" inv LEFT JOIN "Customers" c ON inv."customerId" = c.id LEFT JOIN "Companies" comp ON inv."companyId" = comp.id WHERE inv.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ invoice: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load invoice' });
  }
});

app.post('/api/invoices/:id/payment-link-public', async (req, res) => {
  try {
    const result = await pool.query(`SELECT inv.*, comp.name as "companyName" FROM "Invoices" inv LEFT JOIN "Companies" comp ON inv."companyId" = comp.id WHERE inv.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    const inv = result.rows[0];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: `Invoice ${inv.invoiceNumber}` }, unit_amount: Math.round(parseFloat(inv.total) * 100) }, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?invoice=${inv.id}`,
      cancel_url: `${process.env.FRONTEND_URL}/pay/${inv.id}`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Public payment error:', err.message);
    res.status(500).json({ message: 'Failed to create payment link' });
  }
});

// ─── TWO FACTOR AUTH ─────────────────────────────────────

app.post('/api/auth/2fa/send', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  try {
    const userResult = await pool.query('SELECT * FROM "Users" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(200).json({ message: 'If this email exists, a code was sent' });
    const user = userResult.rows[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query('UPDATE "TwoFactorCodes" SET used = TRUE WHERE "userId" = $1 AND used = FALSE', [user.id]);
    await pool.query('INSERT INTO "TwoFactorCodes" ("userId", code, "expiresAt") VALUES ($1, $2, $3)', [user.id, code, expiresAt]);

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Helix8 <onboarding@resend.dev>',
      to: user.email,
      subject: 'Your Helix8 Login Code',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; color: #0a0f2c;">Helix<span style="color: #06b6d4;">8</span></h1>
          <h2 style="color: #0d1b3e;">Your login code</h2>
          <div style="font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #06b6d4; padding: 24px; background: #f8fafc; border-radius: 12px; text-align: center;">${code}</div>
          <p style="color: #64748b; margin-top: 16px;">This code expires in 10 minutes. Do not share it with anyone.</p>
          <p style="color: #94a3b8; font-size: 13px;">If you did not request this code, ignore this email.</p>
        </div>
      `
    });

    res.json({ message: 'Code sent' });
  } catch (err) {
    console.error('2FA send error:', err.message);
    res.status(500).json({ message: 'Failed to send code' });
  }
});

app.post('/api/auth/2fa/verify', async (req, res) => {
  // 2FA DISABLED - auto verify
  const { email } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM "Users" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(400).json({ message: 'User not found' });
    const user = userResult.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, companyId: user.companyId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, companyId: user.companyId } });
  } catch (err) {
    return res.status(500).json({ message: 'Error' });
  }
  // ORIGINAL 2FA CODE BELOW (disabled)
  if (false) { /* disabled */
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
  try {
    const userResult = await pool.query('SELECT * FROM "Users" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(401).json({ message: 'Invalid code' });
    const user = userResult.rows[0];

    const codeResult = await pool.query(
      'SELECT * FROM "TwoFactorCodes" WHERE "userId" = $1 AND code = $2 AND used = FALSE AND "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1',
      [user.id, code]
    );

    if (codeResult.rows.length === 0) return res.status(401).json({ message: 'Invalid or expired code' });

    await pool.query('UPDATE "TwoFactorCodes" SET used = TRUE WHERE id = $1', [codeResult.rows[0].id]);

    const companyResult = await pool.query('SELECT * FROM "Companies" WHERE id = $1', [user.companyId]);
    const token = jwt.sign({ userId: user.id, companyId: user.companyId, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, companyId: user.companyId },
      company: companyResult.rows[0]
    });
  } catch (err) {
    console.error('2FA verify error:', err.message);
    res.status(500).json({ message: 'Verification failed' });
  }
  } // end if(false)
});

// ─── COMPANY BRANDING ────────────────────────────────────

app.get('/api/company/branding', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT name, logo, "brandColor", "companyTagline" FROM "Companies" WHERE id = $1',
      [req.user.companyId]
    );
    res.json({ branding: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load branding' });
  }
});

app.put('/api/company/branding', requireAuth, requireAdmin, async (req, res) => {
  const { brandColor, companyTagline } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "Companies" SET "brandColor"=$1, "companyTagline"=$2, "updatedAt"=NOW() WHERE id=$3 RETURNING *`,
      [brandColor || '#06b6d4', companyTagline || null, req.user.companyId]
    );
    res.json({ message: 'Branding updated', company: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update branding' });
  }
});

app.post('/api/company/logo', requireAuth, requireAdmin, upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const logoUrl = `/uploads/${req.file.filename}`;
  try {
    await pool.query('UPDATE "Companies" SET logo=$1, "updatedAt"=NOW() WHERE id=$2', [logoUrl, req.user.companyId]);
    res.json({ message: 'Logo uploaded', logoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload logo' });
  }
});

// ─── SUPER ADMIN ─────────────────────────────────────────

const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'helix8-octave-labs-2026';

app.post('/api/super-admin/login', async (req, res) => {
  const { password } = req.body;
  if (password !== SUPER_ADMIN_PASSWORD) return res.status(401).json({ message: 'Invalid password' });
  const token = jwt.sign({ superAdmin: true }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '8h' });
  res.json({ token });
});

const requireSuperAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key');
    if (!decoded.superAdmin) return res.status(403).json({ message: 'Forbidden' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

app.get('/api/super-admin/stats', requireSuperAdmin, async (req, res) => {
  try {
    const companies = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM "Users" u WHERE u."companyId" = c.id) as "userCount",
        (SELECT COUNT(*) FROM "Customers" cu WHERE cu."companyId" = c.id) as "customerCount",
        (SELECT COUNT(*) FROM "WorkOrders" wo WHERE wo."companyId" = c.id) as "workOrderCount",
        (SELECT COUNT(*) FROM "Invoices" inv WHERE inv."companyId" = c.id) as "invoiceCount",
        (SELECT COALESCE(SUM(total), 0) FROM "Invoices" inv WHERE inv."companyId" = c.id AND inv.status = 'paid') as "totalRevenue"
      FROM "Companies" c
      ORDER BY c."createdAt" DESC
    `);

    const now = new Date();
    const totalCompanies = companies.rows.length;
    const totalUsers = companies.rows.reduce((sum, c) => sum + parseInt(c.userCount), 0);
    const totalRevenue = companies.rows.reduce((sum, c) => sum + parseFloat(c.totalRevenue), 0);

    // MRR based on subscription plan
    const planPrices = { basic: 79, pro: 149, enterprise: 299 };
    const subs = await pool.query('SELECT * FROM "Subscriptions"');
    const mrr = subs.rows.reduce((sum, s) => {
      if (s.status === 'active' || s.status === 'trialing') {
        return sum + (planPrices[s.plan] || 79);
      }
      return sum;
    }, 0);

    const trialing = subs.rows.filter(s => s.status === 'trialing').length;
    const paid = subs.rows.filter(s => s.status === 'active').length;
    const cancelled = subs.rows.filter(s => s.status === 'cancelled').length;

    // Active today
    const activeToday = companies.rows.filter(c => (now - new Date(c.updatedAt)) < 24 * 60 * 60 * 1000).length;

    // Churn risk - signed up 3+ days ago but zero work orders
    const churnRisk = companies.rows.filter(c => {
      const daysSinceSignup = (now - new Date(c.createdAt)) / (1000 * 60 * 60 * 24);
      return daysSinceSignup >= 3 && parseInt(c.workOrderCount) === 0;
    });

    // Never logged in - zero customers and zero work orders after 1 day
    const neverUsed = companies.rows.filter(c => {
      const daysSinceSignup = (now - new Date(c.createdAt)) / (1000 * 60 * 60 * 24);
      return daysSinceSignup >= 1 && parseInt(c.customerCount) === 0;
    });

    res.json({
      companies: companies.rows,
      stats: { totalCompanies, totalUsers, totalRevenue, activeToday, mrr, trialing, paid, cancelled },
      churnRisk,
      neverUsed
    });
  } catch (err) {
    console.error('Super admin stats error:', err.message);
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

// ─── INVENTORY ───────────────────────────────────────────

app.get('/api/inventory', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT inv.*, u."firstName", u."lastName" FROM "Inventory" inv
       LEFT JOIN "Users" u ON inv."assignedTo" = u.id
       WHERE inv."companyId" = $1 ORDER BY inv.category, inv.name`,
      [req.user.companyId]
    );
    res.json({ inventory: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load inventory' });
  }
});

app.post('/api/inventory', requireAuth, requireAdmin, async (req, res) => {
  const { name, description, sku, quantity, minQuantity, unitCost, unitPrice, category, assignedTo } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO "Inventory" (name, description, sku, quantity, "minQuantity", "unitCost", "unitPrice", category, "assignedTo", "companyId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, description||null, sku||null, quantity||0, minQuantity||0, unitCost||0, unitPrice||0, category||null, assignedTo||null, req.user.companyId]
    );
    res.json({ message: 'Item created', item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create item' });
  }
});

app.put('/api/inventory/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, description, sku, quantity, minQuantity, unitCost, unitPrice, category, assignedTo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "Inventory" SET name=$1, description=$2, sku=$3, quantity=$4, "minQuantity"=$5, "unitCost"=$6, "unitPrice"=$7, category=$8, "assignedTo"=$9, "updatedAt"=NOW()
       WHERE id=$10 AND "companyId"=$11 RETURNING *`,
      [name, description||null, sku||null, quantity||0, minQuantity||0, unitCost||0, unitPrice||0, category||null, assignedTo||null, req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item updated', item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update item' });
  }
});

app.delete('/api/inventory/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM "Inventory" WHERE id=$1 AND "companyId"=$2 RETURNING *', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

app.patch('/api/inventory/:id/adjust', requireAuth, async (req, res) => {
  const { adjustment, reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "Inventory" SET quantity = quantity + $1, "updatedAt"=NOW() WHERE id=$2 AND "companyId"=$3 RETURNING *`,
      [adjustment, req.params.id, req.user.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Quantity adjusted', item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to adjust quantity' });
  }
});


// ─── INVOICE PAYMENT ─────────────────────────────────────

app.post('/api/invoices/:id/payment-link', requireAuth, async (req, res) => {
  try {
    const invoice = await pool.query(
      `SELECT inv.*, c."firstName", c."lastName", c.email FROM "Invoices" inv
       LEFT JOIN "Customers" c ON inv."customerId" = c.id
       WHERE inv.id = $1 AND inv."companyId" = $2`,
      [req.params.id, req.user.companyId]
    );
    if (invoice.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    const inv = invoice.rows[0];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice #${inv.id} - ${inv.firstName} ${inv.lastName}`,
            description: inv.description || 'Service Invoice',
          },
          unit_amount: Math.round(parseFloat(inv.total) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment-success?invoice=${inv.id}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment-cancelled`,
      customer_email: inv.email || undefined,
      metadata: { invoiceId: String(inv.id), companyId: String(req.user.companyId) },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Payment link error:', err.message);
    res.status(500).json({ message: 'Failed to create payment link' });
  }
});

app.post('/api/webhooks/payment', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const invoiceId = session.metadata?.invoiceId;
    if (invoiceId) {
      await pool.query(
        `UPDATE "Invoices" SET status = 'paid', "updatedAt" = NOW() WHERE id = $1`,
        [invoiceId]
      );
    }
  }
  res.json({ received: true });
});

// ─── CSV IMPORT ──────────────────────────────────────────

app.post('/api/customers/import', requireAuth, async (req, res) => {
  const { customers } = req.body;
  if (!customers || !Array.isArray(customers)) {
    return res.status(400).json({ message: 'Invalid data' });
  }
  let imported = 0;
  let skipped = 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of customers) {
      if (!c.firstName && !c.lastName) { skipped++; continue; }
      await client.query(
        `INSERT INTO "Customers" ("firstName", "lastName", phone, email, address, "companyId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [c.firstName || '', c.lastName || '', c.phone || null, c.email || null, c.address || null, req.user.companyId]
      );
      imported++;
    }
    await client.query('COMMIT');
    res.json({ message: `Successfully imported ${imported} customers`, imported, skipped });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('CSV import error:', err.message);
    res.status(500).json({ message: 'Import failed: ' + err.message });
  } finally {
    client.release();
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


// ─── GLOBAL ERROR HANDLER ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  console.error(err.stack);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    message: isDev ? err.message : 'An unexpected error occurred',
    ...(isDev && { stack: err.stack })
  });
});


// Super Admin Leads CRM Routes
app.get('/api/super-admin/leads', requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, industry, state, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    let where = [];
    let params = [];
    let i = 1;

    if (industry) { where.push(`industry = $${i++}`); params.push(industry); }
    if (state) { where.push(`state = $${i++}`); params.push(state); }
    if (status) { where.push(`status = $${i++}`); params.push(status); }
    if (search) { where.push(`("firstName" ILIKE $${i} OR "lastName" ILIKE $${i} OR company ILIKE $${i} OR city ILIKE $${i})`); params.push(`%${search}%`); i++; }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const leads = await pool.query(`SELECT * FROM "Leads" ${whereClause} ORDER BY id DESC LIMIT $${i} OFFSET $${i+1}`, [...params, limit, offset]);
    const count = await pool.query(`SELECT COUNT(*) FROM "Leads" ${whereClause}`, params);

    res.json({ leads: leads.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
});

app.patch('/api/super-admin/leads/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    await pool.query('UPDATE "Leads" SET status=$1, notes=$2, "updatedAt"=NOW() WHERE id=$3', [status, notes, req.params.id]);
    res.json({ message: 'Lead updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

app.get('/api/super-admin/leads/stats', requireSuperAdmin, async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM "Leads"');
    const byIndustry = await pool.query('SELECT industry, COUNT(*) as count FROM "Leads" GROUP BY industry ORDER BY count DESC');
    const byState = await pool.query('SELECT state, COUNT(*) as count FROM "Leads" GROUP BY state ORDER BY count DESC');
    const byStatus = await pool.query('SELECT status, COUNT(*) as count FROM "Leads" GROUP BY status ORDER BY count DESC');
    res.json({
      total: parseInt(total.rows[0].count),
      byIndustry: byIndustry.rows,
      byState: byState.rows,
      byStatus: byStatus.rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch lead stats' });
  }
});

// ─── HANDLE 404 ROUTES ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ─── HANDLE UNHANDLED PROMISE REJECTIONS ──────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log('Database: PostgreSQL (Helix8)');
  console.log('Auth: JWT + Multi-tenant enabled');
  console.log('Billing: Stripe enabled');
  console.log('Email: Resend enabled');
  console.log('Rate Limiting: Enabled');
  console.log('========================================');
});

