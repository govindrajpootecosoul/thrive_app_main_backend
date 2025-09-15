const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// Route for getting inventory by database
router.get('/:databaseName', inventoryController.getInventoryByDatabase);

// New route for inventory dropdown data (skuList, categoryList, productNameList)
router.get('/:databaseName/dropdown-data', inventoryController.getInventoryDropdownData);

// New route for inventory overstock data
router.get('/:databaseName/overstock-data', inventoryController.getInventoryOverstockData);

// New route for inventory understock data
router.get('/:databaseName/understock-data', inventoryController.getInventoryUnderstockData);

// New route for active SKU out of stock data
router.get('/:databaseName/activeSKUoutofstock-data', inventoryController.getInventoryActiveSKUOutOfStockData);

// New route for inventory count summary
router.get('/:databaseName/count-summary', inventoryController.getInventoryCountSummary);

// New route for stock status counts
router.get('/:databaseName/stock-status-counts', inventoryController.getInventoryStockStatusCounts);

module.exports = router;
