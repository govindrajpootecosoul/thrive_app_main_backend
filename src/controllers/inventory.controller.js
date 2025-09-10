const inventoryService = require('../services/inventory.service');

exports.getInventoryByDatabase = async (req, res) => {
  try {
    await inventoryService.getInventoryByDatabase(req, res);
  } catch (error) {
    console.error('Inventory controller error:', error);
    res.status(500).json({ error: error.message });
  }
};
