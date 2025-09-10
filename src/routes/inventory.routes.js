const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// Route for getting inventory by database
router.get('/:databaseName', inventoryController.getInventoryByDatabase);

module.exports = router;
