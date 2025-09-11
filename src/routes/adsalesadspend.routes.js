const express = require('express');
const router = express.Router();
const adSalesAdSpendController = require('../controllers/adsalesadspend.controller');

router.get('/:databaseName', adSalesAdSpendController.getAdSalesAdSpendByDatabase);

module.exports = router;
