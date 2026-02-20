const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
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
  workOrderId: {
    type: DataTypes.INTEGER
  },
  invoiceNumber: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  invoiceDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2)
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2)
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2)
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2)
  },
  balanceDue: {
    type: DataTypes.DECIMAL(10, 2)
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue'),
    defaultValue: 'draft'
  }
}, {
  tableName: 'invoices',
  underscored: true,
  timestamps: true
});

module.exports = Invoice; 
