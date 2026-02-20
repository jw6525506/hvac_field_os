const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceLineItem = sequelize.define('InvoiceLineItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  itemType: {
    type: DataTypes.ENUM('part', 'labor'),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(200)
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2)
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2)
  }
}, {
  tableName: 'invoice_line_items',
  underscored: true,
  timestamps: true
});

module.exports = InvoiceLineItem;
