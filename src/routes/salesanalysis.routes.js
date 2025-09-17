const express = require('express');
const router = express.Router({ mergeParams: true });
const salesanalysisController = require('../controllers/salesanalysis.controller');

// Sales Data Query Endpoint
router.get('/sales', salesanalysisController.getSalesData);

// Regional Sales Query Endpoint
router.get('/sales/region', salesanalysisController.getRegionalSales);

// Sales Analysis Endpoints
router.get('/sku-list', salesanalysisController.getSkuList);
router.get('/categories-list', salesanalysisController.getCategoriesList);
router.get('/product-names', salesanalysisController.getProductNames);
router.get('/states', salesanalysisController.getStates);
router.get('/cities/:state', salesanalysisController.getCitiesByState);
router.get('/compare', salesanalysisController.getSalesComparison);

// Advertising Data Query Endpoint
router.get('/adData/filterData', salesanalysisController.getAdData);

module.exports = router;
