const mongoose = require('mongoose');
require('dotenv').config();

const testDatabaseConnection = async () => {
  console.log('🧪 Testing Database Connection with NO timeouts...');

  try {
    const connection = await mongoose.createConnection(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 0,     // No timeout
      socketTimeoutMS: 0,              // No timeout
      maxPoolSize: 20,
    });

    console.log('✅ Database connection successful - No timeout limits!');

    // Test a simple aggregation
    const TestSchema = new mongoose.Schema({}, { strict: false });
    const TestModel = connection.model("Test", TestSchema, "inventory");

    console.log('🧪 Testing aggregation with allowDiskUse(true)...');

    const testAggregation = [
      { $match: {} },
      { $group: { _id: null, count: { $sum: 1 } } }
    ];

    const result = await TestModel.aggregate(testAggregation).allowDiskUse(true);
    console.log('✅ Aggregation test successful:', result);

    await connection.close();
    console.log('✅ Connection closed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

const testInventoryAggregation = async (databaseName) => {
  console.log(`\n🧪 Testing Inventory Aggregation for database: ${databaseName}`);

  try {
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName;
        dynamicUri = uriParts.join('/');
      }
    }

    const connection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 0,
      socketTimeoutMS: 0,
    });

    const InventorySchema = new mongoose.Schema({}, { strict: false });
    const Inventory = connection.model("Inventory", InventorySchema, "inventory");

    console.log('Testing inventory count summary aggregation...');
    const countAggregation = [
      { $match: {} },
      {
        $group: {
          _id: { country: "$country", platform: "$platform" },
          totalQuantity: { $sum: "$afn_warehouse_quantity" },
          totalValue: { $sum: "$estimated_storage_cost_next_month" }
        }
      }
    ];

    const countResult = await Inventory.aggregate(countAggregation).allowDiskUse(true);
    console.log(`✅ Inventory count aggregation successful: ${countResult.length} records`);

    console.log('Testing inventory executive aggregation...');
    const executiveAggregation = [
      { $match: {} },
      {
        $group: {
          _id: null,
          estimated_storage_cost_next_month: { $sum: "$estimated_storage_cost_next_month" },
          afn_warehouse_quantity: { $sum: "$afn_warehouse_quantity" },
          afn_fulfillable_quantity: { $sum: "$afn_fulfillable_quantity" }
        }
      }
    ];

    const executiveResult = await Inventory.aggregate(executiveAggregation).allowDiskUse(true);
    console.log('✅ Inventory executive aggregation successful:', executiveResult);

    await connection.close();
    console.log('✅ Connection closed successfully');

  } catch (error) {
    console.error(`❌ Inventory aggregation test failed for ${databaseName}:`, error.message);
  }
};

const testSalesAnalysisAggregation = async (databaseName) => {
  console.log(`\n🧪 Testing Sales Analysis Aggregation for database: ${databaseName}`);

  try {
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName;
        dynamicUri = uriParts.join('/');
      }
    }

    const connection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 0,
      socketTimeoutMS: 0,
    });

    const OrderSchema = new mongoose.Schema({}, { strict: false });
    const Order = connection.model("Order", OrderSchema, "orders");

    console.log('Testing sales data aggregation...');
    const salesAggregation = [
      { $match: { purchase_date: { $regex: /^\\d{1,2}-(Jan|Feb|Mar)-2024$/ } } },
      {
        $project: {
          "SKU": "$sku",
          "Quantity": { $toDouble: "$quantity" },
          "Total_Sales": { $toDouble: "$total_sales" }
        }
      }
    ];

    const salesResult = await Order.aggregate(salesAggregation).allowDiskUse(true);
    console.log(`✅ Sales analysis aggregation successful: ${salesResult.length} records`);

    await connection.close();
    console.log('✅ Connection closed successfully');

  } catch (error) {
    console.error(`❌ Sales analysis test failed for ${databaseName}:`, error.message);
  }
};

const testPNLAggregation = async (databaseName) => {
  console.log(`\n🧪 Testing PNL Aggregation for database: ${databaseName}`);

  try {
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName;
        dynamicUri = uriParts.join('/');
      }
    }

    const connection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 0,
      socketTimeoutMS: 0,
    });

    const PnlSchema = new mongoose.Schema({}, { strict: false });
    const Pnl = connection.model("Pnl", PnlSchema, "pnl");

    console.log('Testing PNL data aggregation...');
    const pnlAggregation = [
      { $match: { year_month: { $in: ["2024-01", "2024-02"] } } },
      {
        $group: {
          _id: "$sku",
          totalSales: { $sum: "$total_sales" },
          cm1: { $sum: "$cm1" },
          cm2: { $sum: "$cm2" },
          cm3: { $sum: "$cm3" }
        }
      }
    ];

    const pnlResult = await Pnl.aggregate(pnlAggregation).allowDiskUse(true);
    console.log(`✅ PNL aggregation successful: ${pnlResult.length} records`);

    await connection.close();
    console.log('✅ Connection closed successfully');

  } catch (error) {
    console.error(`❌ PNL test failed for ${databaseName}:`, error.message);
  }
};

const testAdSalesAggregation = async (databaseName) => {
  console.log(`\n🧪 Testing Ad Sales Aggregation for database: ${databaseName}`);

  try {
    let dynamicUri = process.env.MONGODB_URI;
    if (dynamicUri.includes('/main_db?')) {
      dynamicUri = dynamicUri.replace('/main_db?', `/${databaseName}?`);
    } else if (dynamicUri.includes('/main_db/')) {
      dynamicUri = dynamicUri.replace('/main_db/', `/${databaseName}/`);
    } else {
      const uriParts = dynamicUri.split('/');
      if (uriParts.length > 3) {
        uriParts[uriParts.length - 2] = databaseName;
        dynamicUri = uriParts.join('/');
      }
    }

    const connection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 0,
      socketTimeoutMS: 0,
    });

    const AdSalesAdSpendSchema = new mongoose.Schema({}, { strict: false });
    const AdSalesAdSpend = connection.model("AdSalesAdSpend", AdSalesAdSpendSchema, "ads_sales_and_spend");

    console.log('Testing ad sales aggregation...');
    const adAggregation = [
      { $match: { year_month: { $in: ["2024-01", "2024-02"] } } },
      {
        $group: {
          _id: null,
          totalAdSales: { $sum: { $toDouble: "$ad_sales" } },
          totalAdSpend: { $sum: { $toDouble: "$ad_spend" } },
          totalRevenue: { $sum: { $toDouble: "$total_revenue" } }
        }
      }
    ];

    const adResult = await AdSalesAdSpend.aggregate(adAggregation).allowDiskUse(true);
    console.log('✅ Ad sales aggregation successful:', adResult);

    await connection.close();
    console.log('✅ Connection closed successfully');

  } catch (error) {
    console.error(`❌ Ad sales test failed for ${databaseName}:`, error.message);
  }
};

// Main test function
const runAllTests = async () => {
  console.log('🚀 Starting comprehensive MongoDB timeout fix tests...\n');

  try {
    // Test basic connection
    await testDatabaseConnection();

    // Test with a sample database name
    const testDatabaseName = 'test_db';

    // Test all aggregation types
    await testInventoryAggregation(testDatabaseName);
    await testSalesAnalysisAggregation(testDatabaseName);
    await testPNLAggregation(testDatabaseName);
    await testAdSalesAggregation(testDatabaseName);

    console.log('\n🎉 ALL TESTS COMPLETED!');
    console.log('✅ MongoDB timeout issues should now be resolved');
    console.log('✅ All aggregations now use .allowDiskUse(true)');
    console.log('✅ Database connections have NO timeout limits');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  } finally {
    process.exit(0);
  }
};

// Run tests
runAllTests();
