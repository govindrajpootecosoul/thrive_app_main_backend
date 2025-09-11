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
