const express = require('express');
const userRoutes = require('./routes/user.routes');
const appConstantRoutes = require('./routes/appconstant.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const adSalesAdSpendRoutes = require('./routes/adsalesadspend.routes');
const orderRoutes = require('./routes/order.routes');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/appconstant', appConstantRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/adsalesadspend', adSalesAdSpendRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

module.exports = app;
