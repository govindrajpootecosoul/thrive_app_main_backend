const inventoryService = require('../services/inventory.service');

exports.getInventoryByDatabase = async (req, res) => {
  try {
    await inventoryService.getInventoryByDatabase(req, res);
  } catch (error) {
    console.error('Inventory controller error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryDropdownData = async (req, res) => {
  try {
    await inventoryService.getInventoryDropdownData(req, res);
  } catch (error) {
    console.error('Inventory dropdown controller error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryOverstockData = async (req, res) => {
  try {
    await inventoryService.getInventoryOverstockData(req, res);
  } catch (error) {
    console.error('Inventory overstock controller error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryUnderstockData = async (req, res) => {
  try {
    await inventoryService.getInventoryUnderstockData(req, res);
  } catch (error) {
    console.error('Inventory understock controller error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryActiveSKUOutOfStockData = async (req, res) => {
  try {
    await inventoryService.getInventoryActiveSKUOutOfStockData(req, res);
  } catch (error) {
    console.error('Inventory activeSKUoutofstock controller error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryCountSummary = async (req, res) => {
  try {
    await inventoryService.getInventoryCountSummary(req, res);
  } catch (error) {
    console.error('Inventory count summary controller error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryStockStatusCounts = async (req, res) => {
  try {
    await inventoryService.getInventoryStockStatusCounts(req, res);
  } catch (error) {
    console.error('Inventory stock status counts controller error:', error);
    res.status(500).json({ error: error.message });
  }
};
