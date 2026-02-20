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
