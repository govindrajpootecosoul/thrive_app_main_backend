const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/login', userController.login);
router.get('/client', authMiddleware.authenticateToken, userController.getClientData);
router.get('/details', authMiddleware.authenticateToken, userController.getUserDetails);
router.get('/orders/:databaseName', userController.getOrdersData);

module.exports = router;
