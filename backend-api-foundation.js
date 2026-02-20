// HVAC Field OS - Backend API Foundation
// Node.js + Express + PostgreSQL

// ============================================================================
// PACKAGE.JSON - Dependencies
// ============================================================================

/*
{
  "name": "hvac-field-os-api",
  "version": "1.0.0",
  "description": "Unified HVAC Field Operations System API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node migrations/run.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.35.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-validator": "^7.0.1",
    "morgan": "^1.10.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
*/

// ============================================================================
// SERVER.JS - Main Entry Point
// ============================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const workOrderRoutes = require('./routes/workOrders');
const inventoryRoutes = require('./routes/inventory');
const invoiceRoutes = require('./routes/invoices');
const dispatchRoutes = require('./routes/dispatch');
const dashboardRoutes = require('./routes/dashboard');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

app.listen(PORT, () => {
  console.log(`HVAC Field OS API running on port ${PORT}`);
});

// ============================================================================
// DATABASE CONNECTION (config/database.js)
// ============================================================================

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'hvac_field_os',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;

// ============================================================================
// MODELS - Example: Work Order Model
// ============================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkOrder = sequelize.define('WorkOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  workOrderNumber: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  jobType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('emergency', 'high', 'normal', 'low'),
    defaultValue: 'normal'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'scheduled'
  },
  scheduledStart: {
    type: DataTypes.DATE
  },
  scheduledEnd: {
    type: DataTypes.DATE
  },
  actualStart: {
    type: DataTypes.DATE
  },
  actualEnd: {
    type: DataTypes.DATE
  },
  assignedTechnicianId: {
    type: DataTypes.INTEGER
  },
  description: {
    type: DataTypes.TEXT
  },
  customerComplaint: {
    type: DataTypes.TEXT
  },
  diagnosis: {
    type: DataTypes.TEXT
  },
  workPerformed: {
    type: DataTypes.TEXT
  },
  estimatedCost: {
    type: DataTypes.DECIMAL(10, 2)
  },
  estimatedMargin: {
    type: DataTypes.DECIMAL(5, 2)
  },
  actualCost: {
    type: DataTypes.DECIMAL(10, 2)
  },
  actualMargin: {
    type: DataTypes.DECIMAL(5, 2)
  }
}, {
  tableName: 'work_orders',
  underscored: true,
  timestamps: true
});

module.exports = WorkOrder;

// ============================================================================
// ROUTES - Work Orders Example
// ============================================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const WorkOrder = require('../models/WorkOrder');
const Customer = require('../models/Customer');
const User = require('../models/User');

// Get all work orders with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, technicianId, startDate, endDate } = req.query;
    
    let where = { companyId: req.user.companyId };
    
    if (status) where.status = status;
    if (technicianId) where.assignedTechnicianId = technicianId;
    if (startDate && endDate) {
      where.scheduledStart = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    const workOrders = await WorkOrder.findAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'firstName', 'lastName', 'businessName'] },
        { model: User, as: 'Technician', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['scheduledStart', 'ASC']]
    });
    
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new work order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const workOrderNumber = await generateWorkOrderNumber(req.user.companyId);
    
    const workOrder = await WorkOrder.create({
      ...req.body,
      companyId: req.user.companyId,
      workOrderNumber
    });
    
    // Auto-calculate cost and margin if parts/labor added
    await calculateWorkOrderFinancials(workOrder.id);
    
    res.status(201).json(workOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Complete work order and auto-generate invoice
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Update work order
    workOrder.status = 'completed';
    workOrder.actualEnd = new Date();
    workOrder.workPerformed = req.body.workPerformed;
    await workOrder.save();
    
    // Auto-create invoice
    const invoice = await createInvoiceFromWorkOrder(workOrder);
    
    res.json({
      workOrder,
      invoice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// ============================================================================
// SERVICES - Auto Invoice Creation
// ============================================================================

const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const WorkOrderPart = require('../models/WorkOrderPart');
const WorkOrderLabor = require('../models/WorkOrderLabor');

async function createInvoiceFromWorkOrder(workOrder) {
  try {
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(workOrder.companyId);
    
    // Get all parts used
    const parts = await WorkOrderPart.findAll({
      where: { workOrderId: workOrder.id }
    });
    
    // Get all labor
    const labor = await WorkOrderLabor.findAll({
      where: { workOrderId: workOrder.id }
    });
    
    // Calculate totals
    const partsTotal = parts.reduce((sum, part) => sum + parseFloat(part.totalPrice), 0);
    const laborTotal = labor.reduce((sum, lab) => sum + parseFloat(lab.totalBillable), 0);
    const subtotal = partsTotal + laborTotal;
    const taxRate = 0.08; // 8% - should be configurable
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    
    // Create invoice
    const invoice = await Invoice.create({
      companyId: workOrder.companyId,
      customerId: workOrder.customerId,
      workOrderId: workOrder.id,
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      balanceDue: totalAmount,
      status: 'draft'
    });
    
    // Create line items for parts
    for (const part of parts) {
      await InvoiceLineItem.create({
        invoiceId: invoice.id,
        itemType: 'part',
        description: part.description,
        quantity: part.quantity,
        unitPrice: part.totalPrice / part.quantity,
        totalPrice: part.totalPrice
      });
    }
    
    // Create line items for labor
    for (const lab of labor) {
      await InvoiceLineItem.create({
        invoiceId: invoice.id,
        itemType: 'labor',
        description: `Labor - ${lab.billableHours} hours`,
        quantity: lab.billableHours,
        unitPrice: lab.billableRate,
        totalPrice: lab.totalBillable
      });
    }
    
    return invoice;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// SERVICES - AI-Based Job Costing (Predictive Margin)
// ============================================================================

async function predictJobProfitability(quoteData) {
  // This is a simplified version - in production, integrate with ML model
  
  const { serviceType, estimatedHours, partsTotal, complexity } = quoteData;
  
  // Get historical data for similar jobs
  const historicalJobs = await WorkOrder.findAll({
    where: {
      jobType: serviceType,
      status: 'completed',
      actualCost: { [Op.not]: null }
    },
    limit: 50,
    order: [['createdAt', 'DESC']]
  });
  
  if (historicalJobs.length === 0) {
    return {
      predictedMargin: 30, // Default
      confidence: 'low',
      warning: false
    };
  }
  
  // Calculate average actual hours vs estimated
  const avgHoursRatio = historicalJobs.reduce((sum, job) => {
    const estimated = job.estimatedCost / 100; // Assuming $100/hr
    const actual = job.actualCost / 100;
    return sum + (actual / estimated);
  }, 0) / historicalJobs.length;
  
  // Predict actual hours
  const predictedActualHours = estimatedHours * avgHoursRatio;
  
  // Calculate predicted costs
  const laborCost = predictedActualHours * 50; // $50/hr tech cost
  const totalCost = laborCost + partsTotal;
  
  // Calculate predicted revenue
  const laborRevenue = estimatedHours * 150; // $150/hr billing rate
  const partsRevenue = partsTotal * 1.5; // 50% markup
  const totalRevenue = laborRevenue + partsRevenue;
  
  // Calculate margin
  const predictedMargin = ((totalRevenue - totalCost) / totalRevenue) * 100;
  
  // Set warning if margin is below threshold
  const marginWarning = predictedMargin < 20;
  
  return {
    predictedMargin: predictedMargin.toFixed(2),
    predictedCost: totalCost.toFixed(2),
    predictedRevenue: totalRevenue.toFixed(2),
    confidence: historicalJobs.length > 20 ? 'high' : 'medium',
    warning: marginWarning,
    recommendation: marginWarning ? 
      'Consider increasing price or reducing scope. Margin below 20%.' : 
      'Margin looks healthy.'
  };
}

module.exports = {
  createInvoiceFromWorkOrder,
  predictJobProfitability
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function generateWorkOrderNumber(companyId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  const lastWorkOrder = await WorkOrder.findOne({
    where: { 
      companyId,
      workOrderNumber: {
        [Op.like]: `WO-${year}${month}%`
      }
    },
    order: [['createdAt', 'DESC']]
  });
  
  let sequence = 1;
  if (lastWorkOrder) {
    const lastSequence = parseInt(lastWorkOrder.workOrderNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `WO-${year}${month}${String(sequence).padStart(4, '0')}`;
}

async function generateInvoiceNumber(companyId) {
  const today = new Date();
  const year = today.getFullYear();
  
  const lastInvoice = await Invoice.findOne({
    where: { 
      companyId,
      invoiceNumber: {
        [Op.like]: `INV-${year}%`
      }
    },
    order: [['createdAt', 'DESC']]
  });
  
  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-5));
    sequence = lastSequence + 1;
  }
  
  return `INV-${year}${String(sequence).padStart(5, '0')}`;
}

async function calculateWorkOrderFinancials(workOrderId) {
  const parts = await WorkOrderPart.findAll({ where: { workOrderId } });
  const labor = await WorkOrderLabor.findAll({ where: { workOrderId } });
  
  const partsCost = parts.reduce((sum, p) => sum + parseFloat(p.unitCost) * p.quantity, 0);
  const laborCost = labor.reduce((sum, l) => sum + parseFloat(l.totalCost), 0);
  const totalCost = partsCost + laborCost;
  
  const partsRevenue = parts.reduce((sum, p) => sum + parseFloat(p.totalPrice), 0);
  const laborRevenue = labor.reduce((sum, l) => sum + parseFloat(l.totalBillable), 0);
  const totalRevenue = partsRevenue + laborRevenue;
  
  const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
  
  await WorkOrder.update(
    {
      actualCost: totalCost,
      actualMargin: margin
    },
    { where: { id: workOrderId } }
  );
  
  return { totalCost, totalRevenue, margin };
}
