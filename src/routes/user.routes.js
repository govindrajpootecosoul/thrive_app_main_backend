const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.post('/login', userController.login);
router.get('/details', authenticateToken, userController.getUserDetails);
router.get('/client', authenticateToken, userController.getClientData);
router.get('/orders/:databaseName', authenticateToken, userController.getOrdersData);

module.exports = router;
