const mongoose = require('mongoose');

exports.getInventoryByDatabase = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { sku, category, product, country, platform } = req.query;

    // Create dynamic connection to the specified database
    console.log('Database name:', databaseName);

    // More flexible database name replacement
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      // If no main_db found, try to replace the last database name in the URI
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName; // Replace the database name part
        dynamicUri = uriParts.join('/');
      }
    }

    console.log('Connecting to database:', dynamicUri.replace(/:[^:]*@/, ':***@')); // Log without password
    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Define temporary model
    const InventorySchema = new mongoose.Schema({}, { strict: false });
    const Inventory = dynamicConnection.model("Inventory", InventorySchema, "inventory");

    // Build filter object based on query params
    const filter = {};
    if (sku) filter.sku = sku;
    if (category) filter.product_category = category;
    if (product) filter.product_name = product;
    if (country) filter.country = country;
    if (platform) filter.platform = platform;

    // Get filtered inventory data
    const inventoryData = await Inventory.find(filter);

    console.log('Total inventory items found:', inventoryData.length);

    // Calculate totals
    let totalQuantity = 0;
    let totalValue = 0;
    let totalItems = inventoryData.length;

    inventoryData.forEach(item => {
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

        inventoryData}
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

    // Create dynamic connection to the specified database
    console.log('Database name for inventory dropdown:', databaseName);

    // More flexible database name replacement
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      // If no main_db found, try to replace the last database name in the URI
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName; // Replace the database name part
        dynamicUri = uriParts.join('/');
      }
    }

    console.log('Connecting to database:', dynamicUri.replace(/:[^:]*@/, ':***@')); // Log without password
    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Define temporary model
    const InventorySchema = new mongoose.Schema({}, { strict: false });
    const Inventory = dynamicConnection.model("Inventory", InventorySchema, "inventory");

    // Build filter object for platform and country
    const filter = {};
    if (platform) filter.platform = { $regex: platform, $options: 'i' };
    if (country) filter.country = { $regex: country, $options: 'i' };

    // Get distinct values for dropdowns
    const skuList = await Inventory.distinct('sku', filter);
    const categoryList = await Inventory.distinct('product_category', filter);
    const productNameList = await Inventory.distinct('product_name', filter);

    res.json({
      success: true,
      message: 'Inventory dropdown data retrieved successfully',
      data: {
        skuList: skuList.filter(sku => sku), // Filter out null/undefined
        categoryList: categoryList.filter(category => category), // Filter out null/undefined
        productNameList: productNameList.filter(product => product) // Filter out null/undefined
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

    // Create dynamic connection to the specified database
    console.log('Database name for inventory overstock:', databaseName);

    // More flexible database name replacement
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      // If no main_db found, try to replace the last database name in the URI
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName; // Replace the database name part
        dynamicUri = uriParts.join('/');
      }
    }

    console.log('Connecting to database:', dynamicUri.replace(/:[^:]*@/, ':***@')); // Log without password
    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Define temporary model
    const InventorySchema = new mongoose.Schema({}, { strict: false });
    const Inventory = dynamicConnection.model("Inventory", InventorySchema, "inventory");

    // Build filter object for platform and country
    const filter = {
      stock_status: "Overstock",
      dos_2: { $gte: 90 }
    };
    if (platform) filter.platform = { $regex: platform, $options: 'i' };
    if (country) filter.country = { $regex: country, $options: 'i' };

    // Get filtered inventory data
    const inventoryData = await Inventory.find(filter);

    console.log('Total overstock inventory items found:', inventoryData.length);

    res.json({
      success: true,
      message: 'Inventory overstock data retrieved successfully',
      data: {inventoryData}
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

    // Create dynamic connection to the specified database
    console.log('Database name for inventory understock:', databaseName);

    // More flexible database name replacement
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      // If no main_db found, try to replace the last database name in the URI
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName; // Replace the database name part
        dynamicUri = uriParts.join('/');
      }
    }

    console.log('Connecting to database:', dynamicUri.replace(/:[^:]*@/, ':***@')); // Log without password
    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Define temporary model
    const InventorySchema = new mongoose.Schema({}, { strict: false });
    const Inventory = dynamicConnection.model("Inventory", InventorySchema, "inventory");

    // Build filter object for platform and country
    const filter = {
      stock_status: "Understock",
      dos_2: { $lte: 30 }
    };
    if (platform) filter.platform = { $regex: platform, $options: 'i' };
    if (country) filter.country = { $regex: country, $options: 'i' };

    // Get filtered inventory data
    const inventoryData = await Inventory.find(filter);

    console.log('Total understock inventory items found:', inventoryData.length);

    res.json({
      success: true,
      message: 'Inventory understock data retrieved successfully',
      data: {inventoryData}
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

    // Create dynamic connection to the specified database
    console.log('Database name for inventory activeSKUoutofstock:', databaseName);

    // More flexible database name replacement
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      // If no main_db found, try to replace the last database name in the URI
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName; // Replace the database name part
        dynamicUri = uriParts.join('/');
      }
    }

    console.log('Connecting to database:', dynamicUri.replace(/:[^:]*@/, ':***@')); // Log without password
    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Define temporary model
    const InventorySchema = new mongoose.Schema({}, { strict: false });
    const Inventory = dynamicConnection.model("Inventory", InventorySchema, "inventory");

    // Build filter object for platform and country
    const filter = {
      stock_status: "Understock",
      dos_2: 0
    };
    if (platform) filter.platform = { $regex: platform, $options: 'i' };
    if (country) filter.country = { $regex: country, $options: 'i' };

    // Get filtered inventory data
    const inventoryData = await Inventory.find(filter);

    console.log('Total activeSKUoutofstock inventory items found:', inventoryData.length);

    res.json({
      success: true,
      message: 'Inventory activeSKUoutofstock data retrieved successfully',
      data: {inventoryData}
    });

  } catch (error) {
    console.error('Inventory activeSKUoutofstock service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryCountSummary = async (req, res) => {
  try {
    const { databaseName } = req.params;

    // Create dynamic connection to the specified database
    console.log('Database name for inventory count summary:', databaseName);

    // More flexible database name replacement
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      // If no main_db found, try to replace the last database name in the URI
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName; // Replace the database name part
        dynamicUri = uriParts.join('/');
      }
    }

    console.log('Connecting to database:', dynamicUri.replace(/:[^:]*@/, ':***@')); // Log without password
    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Define temporary model
    const InventorySchema = new mongoose.Schema({}, { strict: false });
    const Inventory = dynamicConnection.model("Inventory", InventorySchema, "inventory");

    // Aggregate count grouped by country and platform
    const aggregationPipeline = [
      {
        $group: {
          _id: { country: "$country", platform: "$platform" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          country: "$_id.country",
          platform: "$_id.platform",
          count: 1
        }
      }
    ];

    const countSummary = await Inventory.aggregate(aggregationPipeline);

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

    // Create dynamic connection to the specified database
    console.log('Database name for inventory stock status counts:', databaseName);

    // More flexible database name replacement
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      // If no main_db found, try to replace the last database name in the URI
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName; // Replace the database name part
        dynamicUri = uriParts.join('/');
      }
    }

    console.log('Connecting to database:', dynamicUri.replace(/:[^:]*@/, ':***@')); // Log without password
    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Define temporary model
    const InventorySchema = new mongoose.Schema({}, { strict: false });
    const Inventory = dynamicConnection.model("Inventory", InventorySchema, "inventory");

    // Build base filter for country and platform
    const baseFilter = {};
    if (platform) baseFilter.platform = { $regex: platform, $options: 'i' };
    if (country) baseFilter.country = { $regex: country, $options: 'i' };

    // Count overstock: stock_status: "Overstock", dos_2: { $gte: 90 }
    const overstockFilter = { ...baseFilter, stock_status: "Overstock", dos_2: { $gte: 90 } };
    const overstockCount = await Inventory.countDocuments(overstockFilter);

    // Count understock: stock_status: "Understock", dos_2: { $lte: 30 }
    const understockFilter = { ...baseFilter, stock_status: "Understock", dos_2: { $lte: 30 } };
    const understockCount = await Inventory.countDocuments(understockFilter);

    // Count active SKU out of stock: stock_status: "Understock", dos_2: 0
    const activeSKUOutOfStockFilter = { ...baseFilter, stock_status: "Understock", dos_2: 0 };
    const activeSKUOutOfStockCount = await Inventory.countDocuments(activeSKUOutOfStockFilter);

    console.log('Stock status counts:', { overstockCount, understockCount, activeSKUOutOfStockCount });

    res.json({
      success: true,
      message: 'Inventory stock status counts retrieved successfully',
      data: {
        overstockCount,
        understockCount,
        activeSKUOutOfStockCount
      }
    });

  } catch (error) {
    console.error('Inventory stock status counts service error:', error);
    res.status(500).json({ error: error.message });
  }
};
