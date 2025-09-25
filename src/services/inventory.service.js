const inventoryData = require('../data_source/All_Geographies_Inventory.json');

// Helper function to calculate in-stock rate
const calculateInStockRate = (data) => {
  let totalRate = 0.0;
  let count = 0;

  for (let item of data) {
    const rate = parseFloat(item['instock_rate_percent']);
    if (!isNaN(rate)) {
      totalRate += rate;
      count++;
    }
  }

  if (count === 0) return 0;

  // Return rounded whole number
  return Math.round(totalRate / count);
};

exports.getInventoryByDatabase = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { sku, category, product, country, platform } = req.query;

    // Build filter object based on query params
    const filter = {};
    if (sku) filter.sku = sku;
    if (category) filter.product_category = category;
    if (product) filter.product_name = product;
    if (country) filter.country = country;
    if (platform) filter.platform = platform;

    // Filter data
    let filteredData = inventoryData.filter(item => {
      return (!filter.sku || item.sku === filter.sku) &&
             (!filter.product_category || item.product_category === filter.product_category) &&
             (!filter.product_name || item.product_name === filter.product_name) &&
             (!filter.country || item.country === filter.country) &&
             (!filter.platform || item.platform === filter.platform);
    });

    console.log('Total inventory items found:', filteredData.length);

    // Calculate totals
    let totalQuantity = 0;
    let totalValue = 0;
    let totalItems = filteredData.length;

    filteredData.forEach(item => {
      totalQuantity += Number(item.quantity) || 0;
      totalValue += Number(item.total_value || item.value) || 0;
    });

    // Return filtered inventory data
    res.json({
      success: true,
      message: 'Inventory data retrieved successfully',

      data:{
            totalItems,
//totalQuantity,
//totalValue,

        inventoryData: filteredData}
    });

  } catch (error) {
    console.error('Inventory service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryDropdownData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { platform, country } = req.query;

    // Build filter object for platform and country
    const filter = {};
    if (platform) filter.platform = platform.toLowerCase();
    if (country) filter.country = country.toLowerCase();

    // Filter data
    let filteredData = inventoryData.filter(item => {
      return (!filter.platform || item.platform.toLowerCase().includes(filter.platform)) &&
             (!filter.country || item.country.toLowerCase().includes(filter.country));
    });

    // Get distinct values
    const skuSet = new Set();
    const categorySet = new Set();
    const productNameSet = new Set();
    filteredData.forEach(item => {
      if (item.sku) skuSet.add(item.sku);
      if (item.product_category) categorySet.add(item.product_category);
      if (item.product_name) productNameSet.add(item.product_name);
    });

    res.json({
      success: true,
      message: 'Inventory dropdown data retrieved successfully',
      data: {
        skuList: Array.from(skuSet),
        categoryList: Array.from(categorySet),
        productNameList: Array.from(productNameSet)
      }
    });

  } catch (error) {
    console.error('Inventory dropdown service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryOverstockData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { country, platform } = req.query;

    // Build filter
    const filter = {};
    if (platform) filter.platform = platform.toLowerCase();
    if (country) filter.country = country.toLowerCase();

    // Filter data
    let filteredData = inventoryData.filter(item => {
      return item.stock_status === "Overstock" &&
             item.dos_2 >= 90 &&
             (!filter.platform || item.platform.toLowerCase().includes(filter.platform)) &&
             (!filter.country || item.country.toLowerCase().includes(filter.country));
    });

    console.log('Total overstock inventory items found:', filteredData.length);

    res.json({
      success: true,
      message: 'Inventory overstock data retrieved successfully',
      data: {inventoryData: filteredData}
    });

  } catch (error) {
    console.error('Inventory overstock service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryUnderstockData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { country, platform } = req.query;

    // Build filter
    const filter = {};
    if (platform) filter.platform = platform.toLowerCase();
    if (country) filter.country = country.toLowerCase();

    // Filter data
    let filteredData = inventoryData.filter(item => {
      return item.stock_status === "Understock" &&
             item.dos_2 <= 30 &&
             (!filter.platform || item.platform.toLowerCase().includes(filter.platform)) &&
             (!filter.country || item.country.toLowerCase().includes(filter.country));
    });

    console.log('Total understock inventory items found:', filteredData.length);

    res.json({
      success: true,
      message: 'Inventory understock data retrieved successfully',
      data: {inventoryData: filteredData}
    });

  } catch (error) {
    console.error('Inventory understock service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryActiveSKUOutOfStockData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { country, platform } = req.query;

    // Build filter
    const filter = {};
    if (platform) filter.platform = platform.toLowerCase();
    if (country) filter.country = country.toLowerCase();

    // Filter data
    let filteredData = inventoryData.filter(item => {
      return item.stock_status === "Understock" &&
             item.dos_2 === 0 &&
             (!filter.platform || item.platform.toLowerCase().includes(filter.platform)) &&
             (!filter.country || item.country.toLowerCase().includes(filter.country));
    });

    console.log('Total activeSKUoutofstock inventory items found:', filteredData.length);

    res.json({
      success: true,
      message: 'Inventory activeSKUoutofstock data retrieved successfully',
      data: {inventoryData: filteredData}
    });

  } catch (error) {
    console.error('Inventory activeSKUoutofstock service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryCountSummary = async (req, res) => {
  try {
    const { databaseName } = req.params;

    // Group by country and platform
    const summary = {};
    inventoryData.forEach(item => {
      const key = `${item.country}_${item.platform}`;
      if (!summary[key]) {
        summary[key] = { country: item.country, platform: item.platform, count: 0 };
      }
      summary[key].count++;
    });

    const countSummary = Object.values(summary);

    console.log('Inventory count summary:', countSummary.length);

    res.json({
      success: true,
      message: 'Inventory count summary retrieved successfully',
      data: countSummary
    });

  } catch (error) {
    console.error('Inventory count summary service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryStockStatusCounts = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { country, platform } = req.query;

    // Build base filter
    const baseFilter = {};
    if (platform) baseFilter.platform = platform.toLowerCase();
    if (country) baseFilter.country = country.toLowerCase();

    // Filter all data for instockrate
    let allData = inventoryData.filter(item => {
      return (!baseFilter.platform || item.platform.toLowerCase().includes(baseFilter.platform)) &&
             (!baseFilter.country || item.country.toLowerCase().includes(baseFilter.country));
    });

    const instockrate = calculateInStockRate(allData);

    // Count overstock
    const overstockCount = inventoryData.filter(item => {
      return item.stock_status === "Overstock" && item.dos_2 >= 90 &&
             (!baseFilter.platform || item.platform.toLowerCase().includes(baseFilter.platform)) &&
             (!baseFilter.country || item.country.toLowerCase().includes(baseFilter.country));
    }).length;

    // Count understock
    const understockCount = inventoryData.filter(item => {
      return item.stock_status === "Understock" && item.dos_2 <= 30 &&
             (!baseFilter.platform || item.platform.toLowerCase().includes(baseFilter.platform)) &&
             (!baseFilter.country || item.country.toLowerCase().includes(baseFilter.country));
    }).length;

    // Count active SKU out of stock
    const activeSKUOutOfStockCount = inventoryData.filter(item => {
      return item.stock_status === "Understock" && item.dos_2 === 0 &&
             (!baseFilter.platform || item.platform.toLowerCase().includes(baseFilter.platform)) &&
             (!baseFilter.country || item.country.toLowerCase().includes(baseFilter.country));
    }).length;

    console.log('Stock status counts:', { overstockCount, understockCount, activeSKUOutOfStockCount, instockrate });

    res.json({
      success: true,
      message: 'Inventory stock status counts retrieved successfully',
      data: {
        overstockCount,
        understockCount,
        activeSKUOutOfStockCount,
        instockrate
      }
    });

  } catch (error) {
    console.error('Inventory stock status counts service error:', error);
    res.status(500).json({ error: error.message });
  }
};
