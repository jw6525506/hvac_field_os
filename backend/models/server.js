const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database
const sequelize = require('./config/database');
const User = require('./models/User');

// Sync database
sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Database sync error', err));

// Routes
const authRoutes = require('./routes/auth');
// Add other routes here, e.g.:
// const customerRoutes = require('./routes/customers');

app.use('/api/auth', authRoutes);
// app.use('/api/customers', customerRoutes);

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'HVAC Field OS API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
