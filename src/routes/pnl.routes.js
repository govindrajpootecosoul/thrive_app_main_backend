const express = require('express');
const router = express.Router();
const pnlController = require('../controllers/pnl.controller');

router.get('/:databaseName/pnl-data', pnlController.getPnlData);

module.exports = router;
