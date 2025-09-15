const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// Route for getting order list by database
router.get('/:databaseName/orderlist', orderController.getOrderListByDatabase);

// New route for dropdown data
router.get('/:databaseName/dropdown-data', orderController.getDropdownData);

module.exports = router;
