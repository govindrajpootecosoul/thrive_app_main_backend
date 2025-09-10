const express = require('express');
const router = express.Router();
const appConstantController = require('../controllers/appconstant.controller');

router.get('/', appConstantController.getAllConstants);
router.get('/:key', appConstantController.getConstantByKey);

module.exports = router;
