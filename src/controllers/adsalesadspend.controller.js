const adSalesAdSpendService = require('../services/adsalesadspend.service');

exports.getAdSalesAdSpendByDatabase = async (req, res) => {
  await adSalesAdSpendService.getAdSalesAdSpendByDatabase(req, res);
};
