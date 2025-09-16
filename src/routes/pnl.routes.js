const express = require('express');
const router = express.Router();
const pnlController = require('../controllers/pnl.controller');

router.get('/:databaseName/pnl-data', pnlController.getPnlData);
router.get('/:databaseName/pnlexecutive', pnlController.getPnlExecutiveData);
router.get('/:databaseName/pnldropdown', pnlController.getPnlDropdownData);

module.exports = router;
