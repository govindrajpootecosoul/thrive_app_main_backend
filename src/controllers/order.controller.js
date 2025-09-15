const orderService = require('../services/order.service');

exports.getOrderListByDatabase = async (req, res) => {
  try {
    await orderService.getOrderListByDatabase(req, res);
  } catch (error) {
    console.error('Order controller error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getDropdownData = async (req, res) => {
  try {
    await orderService.getDropdownData(req, res);
  } catch (error) {
    console.error('Dropdown controller error:', error);
    res.status(500).json({ error: error.message });
  }
};
