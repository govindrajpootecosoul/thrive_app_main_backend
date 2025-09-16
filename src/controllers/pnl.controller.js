const pnlService = require('../services/pnl.service');

exports.getPnlData = async (req, res) => {
  await pnlService.getPnlData(req, res);
};

exports.getPnlExecutiveData = async (req, res) => {
  await pnlService.getPnlExecutiveData(req, res);
};
