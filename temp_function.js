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
