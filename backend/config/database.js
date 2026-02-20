const { Sequelize } = require('sequelize');

// 🔥 Force literal password here, do not rely on env variable
const sequelize = new Sequelize(
  'hvac_field_os',      // DB name
  'postgres',           // DB user
  'password123',        // DB password EXACTLY as you set in Postgres
  {
    host: 'localhost',
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
