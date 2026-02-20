const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkOrderPart = sequelize.define('WorkOrderPart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  workOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(200)
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2)
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2)
  }
}, {
  tableName: 'work_order_parts',
  underscored: true,
  timestamps: true
});

module.exports = WorkOrderPart;
