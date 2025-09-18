const mongoose = require('mongoose');
const moment = require('moment');

exports.getPnlData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const {
      sku,
      category,
      productName,
      country,
      platform,
      date,
      range,
      startMonth,
      endMonth,
      cm3Type,
      sortOrder
    } = req.query;

    if (!range && !date && !startMonth && !endMonth) {
      return res.status(400).json({
        status: 400,
        error: {
          code: "BAD_REQUEST",
          message: "range, date, startMonth, or endMonth is required",
          details: "Provide a valid range parameter (currentmonths, lastmonth, yeartodate, lastyear) or date/startMonth-endMonth parameters."
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create dynamic connection to the specified database
    console.log('Database name for PNL data:', databaseName);

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
    const PnlSchema = new mongoose.Schema({}, { strict: false });
    const Pnl = dynamicConnection.model("Pnl", PnlSchema, "pnl");

    // Build filter object
    const filter = {};

    // Basic filters
    if (sku) filter.sku = sku;
    if (category) filter.product_category = category;
    if (productName) filter.product_name = productName;
    if (country) filter.country = country;
    if (platform) filter.platform = platform;

    // Date range filters
    const yearMonthFilter = [];
    const now = moment();

    if (date) {
      // Specific date (YYYY-MM)
      yearMonthFilter.push(date);
    } else if (range) {
      switch (range) {
        case 'currentmonths':
          yearMonthFilter.push(now.format('YYYY-MM'));
          break;
        case 'lastmonth':
          yearMonthFilter.push(now.subtract(1, 'month').format('YYYY-MM'));
          break;
        case 'yeartodate':
          const currentYear = now.year();
          const currentMonth = now.month() + 1; // moment months are 0-based
          for (let month = 1; month <= currentMonth; month++) {
            yearMonthFilter.push(`${currentYear}-${month.toString().padStart(2, '0')}`);
          }
          break;
        case 'lastyear':
          const lastyear = now.year() - 1;
          for (let month = 1; month <= 12; month++) {
            yearMonthFilter.push(`${lastyear}-${month.toString().padStart(2, '0')}`);
          }
          break;
        default:
          return res.status(400).json({
            status: 400,
            error: {
              code: "BAD_REQUEST",
              message: `Invalid range: ${range}`,
              details: "Provide a valid range parameter such as currentmonths, lastmonth, yeartodate, or lastyear."
            },
            timestamp: new Date().toISOString()
          });
      }
    } else if (startMonth && endMonth) {
      // Custom range
      const start = moment(startMonth, 'YYYY-MM');
      const end = moment(endMonth, 'YYYY-MM');
      let current = start.clone();
      while (current.isSameOrBefore(end)) {
        yearMonthFilter.push(current.format('YYYY-MM'));
        current.add(1, 'month');
      }
    }

    if (yearMonthFilter.length > 0) {
      filter.year_month = { $in: yearMonthFilter };
    }

    // CM3 type filter
    if (cm3Type) {
      switch (cm3Type) {
        case 'gainer':
          filter.cm3 = { $gte: 0 };
          break;
        case 'drainer':
          filter.cm3 = { $lt: 0 };
          break;
        case 'all':
          // No filter
          break;
      }
    }

    // Build sort query
    const sortQuery = {};
    if (sortOrder) {
      switch (sortOrder) {
        case 'ascending':
          sortQuery.cm3 = 1;
          break;
        case 'descending':
          sortQuery.cm3 = -1;
          break;
      }
    }

    console.log('PNL filter:', filter);
    console.log('PNL sort:', sortQuery);

    // Aggregation pipeline to group by sku and sum data
    const aggregationPipeline = [
      { $match: filter },
      {
        $group: {
          _id: "$sku",
          sku: { $first: "$sku" },
          product_name: { $first: "$product_name" },
          product_category: { $first: "$product_category" },
          country: { $first: "$country" },
          platform: { $first: "$platform" },
          year_month: { $first: "$year_month" },
          ad_cost: { $sum: "$ad_cost" },
          deal_fee: { $sum: "$deal_fee" },
          fba_inventory_fee: { $sum: "$fba_inventory_fee" },
          fba_reimbursement: { $sum: "$fba_reimbursement" },
          liquidations: { $sum: "$liquidations" },
          net_sales: { $sum: "$net_sales" },
          net_sales_with_tax: { $sum: "$net_sales_with_tax" },
          other_marketing_expenses: { $sum: "$other_marketing_expenses" },
          storage_fee: { $sum: "$storage_fee" },
          total_return_with_tax: { $sum: "$total_return_with_tax" },
          total_sales: { $sum: "$total_sales" },
          total_sales_with_tax: { $sum: "$total_sales_with_tax" },
          total_units: { $sum: "$total_units" },
          total_return_amount: { $sum: "$total_return_amount" },
          fba_fees: { $sum: "$fba_fees" },
          promotional_rebates: { $sum: "$promotional_rebates" },
          quantity: { $sum: "$quantity" },
          refund_quantity: { $sum: "$refund_quantity" },
          selling_fees: { $sum: "$selling_fees" },
          spend: { $sum: "$spend" },
          product_cogs: { $sum: "$product_cogs" },
          cogs: { $sum: "$cogs" },
          cm1: { $sum: "$cm1" },
          heads_cm2: { $sum: "$heads_cm2" },
          cm2: { $sum: "$cm2" },
          heads_cm3: { $sum: "$heads_cm3" },
          cm3: { $sum: "$cm3" }
        }
      }
    ];

    // Add sort stage only if sortQuery is not empty
    if (Object.keys(sortQuery).length > 0) {
      aggregationPipeline.push({ $sort: sortQuery });
    }

    // Query MongoDB with aggregation
    const pnlData = await Pnl.aggregate(aggregationPipeline);

    console.log('Total PNL records found:', pnlData.length);

    res.json({
      success: true,
      message: 'PNL data retrieved successfully',
      data: {pnlData}
    });

  } catch (error) {
    console.error('PNL service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPnlExecutiveData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const {
      sku,
      category,
      productName,
      country,
      platform,
      date,
      range,
      startMonth,
      endMonth,
      cm3Type
    } = req.query;

    if (!range && !date && !startMonth && !endMonth) {
      return res.status(400).json({
        status: 400,
        error: {
          code: "BAD_REQUEST",
          message: "range, date, startMonth, or endMonth is required",
          details: "Provide a valid range parameter (currentmonths, lastmonth, yeartodate, lastyear) or date/startMonth-endMonth parameters."
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create dynamic connection to the specified database
    console.log('Database name for PNL Executive data:', databaseName);

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
    const PnlSchema = new mongoose.Schema({}, { strict: false });
    const Pnl = dynamicConnection.model("Pnl", PnlSchema, "pnl");

    // Build filter object
    const filter = {};

    // Basic filters
    if (sku) filter.sku = sku;
    if (category) filter.product_category = category;
    if (productName) filter.product_name = productName;
    if (country) filter.country = country;
    if (platform) filter.platform = platform;

    // Date range filters
    const yearMonthFilter = [];
    const now = moment();

    if (date) {
      // Specific date (YYYY-MM)
      yearMonthFilter.push(date);
    } else if (range) {
      switch (range) {
        case 'currentmonths':
          yearMonthFilter.push(now.format('YYYY-MM'));
          break;
        case 'lastmonth':
          yearMonthFilter.push(now.subtract(1, 'month').format('YYYY-MM'));
          break;
        case 'yeartodate':
          const currentYear = now.year();
          const currentMonth = now.month() + 1; // moment months are 0-based
          for (let month = 1; month <= currentMonth; month++) {
            yearMonthFilter.push(`${currentYear}-${month.toString().padStart(2, '0')}`);
          }
          break;
        case 'lastyear':
          const lastyear = now.year() - 1;
          for (let month = 1; month <= 12; month++) {
            yearMonthFilter.push(`${lastyear}-${month.toString().padStart(2, '0')}`);
          }
          break;
        default:
          return res.status(400).json({
            status: 400,
            message: "Provide a valid range parameter such as currentmonths, lastmonth, yeartodate, or lastyear.",
            success: false,
            data: {
              code: "BAD_REQUEST",
              message: `Invalid range: ${range}`,
              details: "Provide a valid range parameter such as currentmonths, lastmonth, yeartodate, or lastyear."
            },
            timestamp: new Date().toISOString()
          });
      }
    } else if (startMonth && endMonth) {
      // Custom range
      const start = moment(startMonth, 'YYYY-MM');
      const end = moment(endMonth, 'YYYY-MM');
      let current = start.clone();
      while (current.isSameOrBefore(end)) {
        yearMonthFilter.push(current.format('YYYY-MM'));
        current.add(1, 'month');
      }
    }

    if (yearMonthFilter.length > 0) {
      filter.year_month = { $in: yearMonthFilter };
    }

    // CM3 type filter
    if (cm3Type) {
      switch (cm3Type) {
        case 'gainer':
          filter.cm3 = { $gte: 0 };
          break;
        case 'drainer':
          filter.cm3 = { $lt: 0 };
          break;
        case 'all':
          // No filter
          break;
      }
    }

    // Aggregation pipeline
    const aggregationPipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          ad_cost: { $sum: "$ad_cost" },
          deal_fee: { $sum: "$deal_fee" },
          fba_inventory_fee: { $sum: "$fba_inventory_fee" },
          fba_reimbursement: { $sum: "$fba_reimbursement" },
          liquidations: { $sum: "$liquidations" },
          net_sales: { $sum: "$net_sales" },
          net_sales_with_tax: { $sum: "$net_sales_with_tax" },
          other_marketing_expenses: { $sum: "$other_marketing_expenses" },
          storage_fee: { $sum: "$storage_fee" },
          total_return_with_tax: { $sum: "$total_return_with_tax" },
          total_sales: { $sum: "$total_sales" },
          total_sales_with_tax: { $sum: "$total_sales_with_tax" },
          total_units: { $sum: "$total_units" },
          total_return_amount: { $sum: "$total_return_amount" },
          fba_fees: { $sum: "$fba_fees" },
          promotional_rebates: { $sum: "$promotional_rebates" },
          quantity: { $sum: "$quantity" },
          refund_quantity: { $sum: "$refund_quantity" },
          selling_fees: { $sum: "$selling_fees" },
          spend: { $sum: "$spend" },
          product_cogs: { $sum: "$product_cogs" },
          cogs: { $sum: "$cogs" },
          cm1: { $sum: "$cm1" },
          heads_cm2: { $sum: "$heads_cm2" },
          cm2: { $sum: "$cm2" },
          heads_cm3: { $sum: "$heads_cm3" },
          cm3: { $sum: "$cm3" }
        }
      }
    ];

    const pnlExecutiveData = await Pnl.aggregate(aggregationPipeline);

    res.json({
      success: true,
      message: 'PNL Executive data retrieved successfully',
      data: pnlExecutiveData.length > 0 ? pnlExecutiveData[0] : {}
    });

  } catch (error) {
    console.error('PNL Executive service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPnlDropdownData = async (req, res) => {
  try {
    const { databaseName } = req.params;

    // Create dynamic connection to the specified database
    console.log('Database name for PNL Dropdown data:', databaseName);

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
    const PnlSchema = new mongoose.Schema({}, { strict: false });
    const Pnl = dynamicConnection.model("Pnl", PnlSchema, "pnl");

    // Aggregation pipeline to get distinct values
    const aggregationPipeline = [
      {
        $group: {
          _id: null,
          skuList: { $addToSet: "$sku" },
          categoryList: { $addToSet: "$product_category" },
          productNameList: { $addToSet: "$product_name" }
        }
      },
      {
        $project: {
          _id: 0,
          skuList: 1,
          categoryList: 1,
          productNameList: 1
        }
      }
    ];

    const dropdownData = await Pnl.aggregate(aggregationPipeline);

    res.json({
      success: true,
      message: 'PNL Dropdown data retrieved successfully',
      data: dropdownData.length > 0 ? dropdownData[0] : { skuList: [], categoryList: [], productNameList: [] }
    });

  } catch (error) {
    console.error('PNL Dropdown service error:', error);
    res.status(500).json({ error: error.message });
  }
};
