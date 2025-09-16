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

    // Query MongoDB
    const pnlData = await Pnl.find(filter).sort(sortQuery);

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
