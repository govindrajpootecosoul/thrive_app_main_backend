const mongoose = require('mongoose');
const moment = require('moment');

exports.getInventoryExecutiveData = async (req, res) => {
  try {
    const { databaseName } = req.params;

    // Create dynamic connection to the specified database
    console.log('Database name for Inventory Executive data:', databaseName);

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

    // Build filter object (optional: add filters if needed)
    const { country, platform } = req.query;
    const filter = {};
    if (country) filter.country = { $regex: country, $options: 'i' };
    if (platform) filter.platform = { $regex: platform, $options: 'i' };

    // Aggregation pipeline to sum required fields and calculate active sku count
    const aggregationPipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          estimated_storage_cost_next_month: { $sum: "$estimated_storage_cost_next_month" },
          DOS_2: { $avg: "$dos_2" },
          afn_warehouse_quantity: { $sum: "$afn_warehouse_quantity" },
          afn_fulfillable_quantity: { $sum: "$afn_fulfillable_quantity" },
          afn_unsellable_quantity: { $sum: "$afn_unsellable_quantity" },
          fctransfer: { $sum: "$fc_transfer" },
          customer_reserved: { $sum: "$customer_reserved" },
          fc_processing: { $sum: "$fc_processing" },
          inv_age_0_to_90_days: {
            $sum: {
              $add: [
                "$inv_age_0_to_30_days",
                "$inv_age_31_to_60_days",
                "$inv_age_61_to_90_days"
              ]
            }
          },
          inv_age_91_to_270_days: {
            $sum: {
              $add: [
                "$inv_age_91_to_180_days",
                "$inv_age_181_to_270_days"
              ]
            }
          },
          instock_rate_percent: { $avg: "$instock_rate_percent" },
          active_sku_out_of_stock_count: {
            $sum: {
              $cond: [
                { $and: [
                    { $eq: ["$stock_status", "Understock"] },
                    { $eq: ["$dos_2", 0] }
                  ] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          estimated_storage_cost_next_month: 1,
          DOS_2: 1,
          afn_warehouse_quantity: 1,
          afn_fulfillable_quantity: 1,
          afn_unsellable_quantity: 1,
          fctransfer: 1,
          customer_reserved: 1,
          fc_processing: 1,
          inv_age_0_to_90_days: 1,
          inv_age_91_to_270_days: 1,
          instock_rate_percent: 1,
          active_sku_out_of_stock_count: 1
        }
      }
    ];

    const inventoryExecutiveData = await Inventory.aggregate(aggregationPipeline);

    res.json({
      success: true,
      message: 'Inventory Executive data retrieved successfully',
      data: inventoryExecutiveData.length > 0 ? inventoryExecutiveData[0] : {}
    });

  } catch (error) {
    console.error('Inventory Executive service error:', error);
    res.status(500).json({ error: error.message });
  }
};
