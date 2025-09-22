const mongoose = require('mongoose');
require('dotenv').config();

async function testInventoryAggregation() {
  try {
    console.log('🧪 Testing inventory aggregation without timeout...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 0,
      socketTimeoutMS: 0,
    });

    console.log('✅ Connected to MongoDB');

    // Get database name from environment or use default
    const dbName = process.env.DB_NAME || 'main_db';
    const db = mongoose.connection.useDb(dbName);

    // Define temporary model
    const InventorySchema = new mongoose.Schema({}, { strict: false });
    const Inventory = db.model("Inventory", InventorySchema, "inventory");

    console.log('📊 Testing aggregation pipeline...');

    // Test aggregation with allowDiskUse
    const startTime = Date.now();

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

    const result = await Inventory.aggregate(aggregationPipeline).allowDiskUse(true);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`✅ Aggregation completed successfully!`);
    console.log(`⏱️  Execution time: ${duration} seconds`);
    console.log(`📈 Result count: ${result.length}`);

    if (result.length > 0) {
      console.log('📋 Sample results:', result.slice(0, 3));
    }

    console.log('🎉 Test PASSED - No timeout issues!');

  } catch (error) {
    console.error('❌ Test FAILED:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testInventoryAggregation();
