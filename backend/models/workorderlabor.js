const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkOrderLabor = sequelize.define('WorkOrderLabor', {
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
  billableHours: {
    type: DataTypes.DECIMAL(5, 2)
  },
  billableRate: {
    type: DataTypes.DECIMAL(10, 2)
  },
  totalBillable: {
    type: DataTypes.DECIMAL(10, 2)
  }
}, {
  tableName: 'work_order_labors',
  underscored: true,
  timestamps: true
});

module.exports = WorkOrderLabor;
