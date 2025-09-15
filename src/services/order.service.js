const mongoose = require('mongoose');

exports.getOrderListByDatabase = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const {
      sku,
      product_category,
      product_name,
      platform,
      country,
      filterType = "currentmonth",
      fromDate,
      toDate,
      startMonth,
      endMonth
    } = req.query;

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
    const OrderSchema = new mongoose.Schema({}, { strict: false });
    const Order = dynamicConnection.model("Order", OrderSchema, "orders");

    const today = new Date();
    console.log('Today\'s date:', today.toISOString());

    let currentStartDate, currentEndDate;

    // Use UTC for consistent date handling
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth();

    // Helper function to parse MM-YYYY format
    const parseMonthYear = (monthYearStr) => {
      if (!monthYearStr || !monthYearStr.includes('-')) return null;
      const [month, year] = monthYearStr.split('-').map(s => parseInt(s.trim()));
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;
      return { month: month - 1, year }; // month is 0-indexed in JS Date
    };

    // Filter ranges
    if (startMonth && endMonth) {
      // Custom range: MM-YYYY to MM-YYYY
      const startParsed = parseMonthYear(startMonth);
      const endParsed = parseMonthYear(endMonth);

      if (startParsed && endParsed) {
        currentStartDate = new Date(Date.UTC(startParsed.year, startParsed.month, 1));
        currentEndDate = new Date(Date.UTC(endParsed.year, endParsed.month + 1, 0, 23, 59, 59, 999));
      } else {
        // Invalid format, fallback to current month
        currentStartDate = new Date(Date.UTC(currentYear, currentMonth, 1));
        currentEndDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
      }
    } else if (fromDate && toDate) {
      // Direct date range
      currentStartDate = new Date(fromDate);
      currentEndDate = new Date(toDate);
      currentEndDate.setHours(23, 59, 59, 999);
    } else {
      switch (filterType) {
        case "currentmonth": {
          // Current month: from 1st to last day of current month
          currentStartDate = new Date(Date.UTC(currentYear, currentMonth, 1));
          currentEndDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
          break;
        }
        case "previousmonth": {
          // Previous month: full previous month
          const previousMonth = currentMonth - 1;
          const previousYear = previousMonth < 0 ? currentYear - 1 : currentYear;
          const adjustedPrevMonth = (previousMonth + 12) % 12;
          currentStartDate = new Date(Date.UTC(previousYear, adjustedPrevMonth, 1));
          currentEndDate = new Date(Date.UTC(previousYear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999));
          break;
        }
        case "currentyear": {
          // Current year: from Jan 1st to Dec 31st of current year
          currentStartDate = new Date(Date.UTC(currentYear, 0, 1)); // January 1st
          currentEndDate = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999)); // December 31st
          break;
        }
        case "6months":
        default: {
          currentStartDate = new Date(Date.UTC(currentYear, currentMonth - 5, 1));
          currentEndDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
          break;
        }
      }
    }

    // Build filter object
    const filter = {};
    if (sku) filter.sku = sku;
    if (product_category) filter.product_category = product_category;
    if (product_name) filter.product_name = product_name;
    if (platform) filter.platform = { $regex: platform, $options: 'i' };
    if (country) filter.country = { $regex: country, $options: 'i' };

    // Date filter using the calculated date range - handle both string and Date formats
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate combined regex pattern for all months and years in the current period
    const generateCombinedRegex = (startDate, endDate) => {
      const monthYearPatterns = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

      while (current <= end) {
        const year = current.getUTCFullYear();
        const month = current.getUTCMonth();
        const monthName = monthNames[month];
        monthYearPatterns.push(`${monthName}-${year}`);
        current.setUTCMonth(current.getUTCMonth() + 1);
      }

      // Create combined regex pattern: ^\d{1,2}-(Aug-2025|Sep-2025|Oct-2025)$
      const monthYearGroup = monthYearPatterns.join('|');
      return new RegExp(`^\\d{1,2}-(${monthYearGroup})$`);
    };

    const currentRegex = generateCombinedRegex(currentStartDate, currentEndDate);
    filter.$or = [
      { purchase_date: { $regex: currentRegex } }
    ];

    // Get orders data
    const orders = await Order.find(filter);

    // Group by sku
    const groupedData = {};
    orders.forEach(order => {
      const key = order.sku;
      if (!groupedData[key]) {
        groupedData[key] = {
          sku: order.sku,
          product_name: order.product_name,
          product_category: order.product_category,
          sold_qty: 0,
          revenue: 0,
          purchase_date: order.purchase_date
        };
      }
      groupedData[key].sold_qty += Number(order.quantity) || 0;
      groupedData[key].revenue += Number(order.total_sales) || 0;

      // Update to latest purchase_date if current one is newer
      if (new Date(order.purchase_date) > new Date(groupedData[key].purchase_date)) {
        groupedData[key].purchase_date = order.purchase_date;
      }
    });

    // Convert to array and sort by purchase_date descending (latest first)
    const skudata = Object.values(groupedData).sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));

    res.json({
      success: true,
      message: 'Order list retrieved successfully',
      data: {skudata}
    });

  } catch (error) {
    console.error('Order list service error:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.getOrdersByDatabase = async (req, res) => {
  try {
    const {
      sku,
      platform,
      filterType = "currentmonth",
      purchase_date, // Support legacy parameter name
      fromDate,
      toDate,
      startMonth,
      endMonth,
      state,
      city,
      country
    } = req.query;

    const { databaseName } = req.params;

    // Use purchase_date if provided, otherwise use filterType
    const effectiveFilterType = purchase_date || filterType;

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
    const OrderSchema = new mongoose.Schema({}, { strict: false });
    const Order = dynamicConnection.model("Order", OrderSchema, "orders");

    const today = new Date();
    console.log('Today\'s date:', today.toISOString());
    const query = {};

    let currentStartDate, currentEndDate;
    let previousStartDate, previousEndDate;

    // Use UTC for consistent date handling
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth();

    // Helper function to parse MM-YYYY format
    const parseMonthYear = (monthYearStr) => {
      if (!monthYearStr || !monthYearStr.includes('-')) return null;
      const [month, year] = monthYearStr.split('-').map(s => parseInt(s.trim()));
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;
      return { month: month - 1, year }; // month is 0-indexed in JS Date
    };

    // Filter ranges
    if (startMonth && endMonth) {
      // Custom range: MM-YYYY to MM-YYYY
      const startParsed = parseMonthYear(startMonth);
      const endParsed = parseMonthYear(endMonth);

      if (startParsed && endParsed) {
        currentStartDate = new Date(Date.UTC(startParsed.year, startParsed.month, 1));
        currentEndDate = new Date(Date.UTC(endParsed.year, endParsed.month + 1, 0, 23, 59, 59, 999));

        // Calculate previous period with same duration
        const duration = (currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24) + 1;
        previousEndDate = new Date(currentStartDate.getTime() - 1);
        previousStartDate = new Date(previousEndDate.getTime() - (duration - 1) * 86400000);
      } else {
        // Invalid format, fallback to current month
        currentStartDate = new Date(Date.UTC(currentYear, currentMonth, 1));
        currentEndDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
        const previousMonth = currentMonth - 1;
        const previousYear = previousMonth < 0 ? currentYear - 1 : currentYear;
        const adjustedPrevMonth = (previousMonth + 12) % 12;
        previousStartDate = new Date(Date.UTC(previousYear, adjustedPrevMonth, 1));
        previousEndDate = new Date(Date.UTC(previousYear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999));
      }
    } else {
      switch (effectiveFilterType) {
        case "currentmonth": {
          // Current month: from 1st to last day of current month
          currentStartDate = new Date(Date.UTC(currentYear, currentMonth, 1));
          currentEndDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

          // Previous month for comparison
          const previousMonth = currentMonth - 1;
          const previousYear = previousMonth < 0 ? currentYear - 1 : currentYear;
          const adjustedPrevMonth = (previousMonth + 12) % 12;

          previousStartDate = new Date(Date.UTC(previousYear, adjustedPrevMonth, 1));
          previousEndDate = new Date(Date.UTC(previousYear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999));
          break;
        }
        case "previousmonth": {
          // Previous month: full previous month
          const previousMonth = currentMonth - 1;
          const previousYear = previousMonth < 0 ? currentYear - 1 : currentYear;
          const adjustedPrevMonth = (previousMonth + 12) % 12;
          currentStartDate = new Date(Date.UTC(previousYear, adjustedPrevMonth, 1));
          currentEndDate = new Date(Date.UTC(previousYear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999));

          // Month before previous for comparison
          const monthBeforeLast = adjustedPrevMonth - 1;
          const yearBeforeLast = monthBeforeLast < 0 ? previousYear - 1 : previousYear;
          const adjustedMonthBeforeLast = (monthBeforeLast + 12) % 12;
          previousStartDate = new Date(Date.UTC(yearBeforeLast, adjustedMonthBeforeLast, 1));
          previousEndDate = new Date(Date.UTC(yearBeforeLast, adjustedMonthBeforeLast + 1, 0, 23, 59, 59, 999));
          break;
        }
        case "currentyear": {
          // Current year: from Jan 1st to Dec 31st of current year
          currentStartDate = new Date(Date.UTC(currentYear, 0, 1)); // January 1st
          currentEndDate = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999)); // December 31st

          // Previous year for comparison
          previousStartDate = new Date(Date.UTC(currentYear - 1, 0, 1)); // January 1st of previous year
          previousEndDate = new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999)); // December 31st of previous year
          break;
        }
        case "6months":
        default: {
          currentStartDate = new Date(Date.UTC(currentYear, currentMonth - 5, 1));
          currentEndDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
          const duration = (currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24) + 1;
          previousEndDate = new Date(currentStartDate.getTime() - 1);
          previousStartDate = new Date(previousEndDate.getTime() - (duration - 1) * 86400000);
          break;
        }
      }
    }

    // Filters
    if (sku) query.SKU = { $in: sku.split(",").map(s => s.trim()) };
    if (platform) query.platform = { $regex: platform, $options: 'i' };
    if (state) query.state = state;
    if (city) query.city = city;
    if (country) query.country = { $regex: country, $options: 'i' };

    console.log('Final query:', JSON.stringify(query, null, 2));
    console.log('Date range:', { currentStartDate, currentEndDate });

    // Test query to see if we can find any data at all
    const testOrders = await Order.find({}).limit(5);
    console.log('Test query - Total orders in collection:', testOrders.length);
    if (testOrders.length > 0) {
      console.log('Sample order:', JSON.stringify(testOrders[0], null, 2));
    }

    // Current period data - handle multiple months for custom ranges and year ranges
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate combined regex pattern for all months in the current period
    const generateCombinedRegex = (startDate, endDate) => {
      const monthPatterns = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

      while (current <= end) {
        const year = current.getUTCFullYear();
        const month = current.getUTCMonth();
        const monthName = monthNames[month];
        monthPatterns.push(monthName);
        current.setUTCMonth(current.getUTCMonth() + 1);
      }

      // Create combined regex pattern: ^\d{1,2}-(Aug|Sep|Oct)-2025$
      const year = start.getUTCFullYear();
      const monthGroup = monthPatterns.join('|');
      return new RegExp(`^\\d{1,2}-(${monthGroup})-${year}$`);
    };

    const currentRegex = generateCombinedRegex(currentStartDate, currentEndDate);
    const currentOrders = await Order.find({
      ...query,
      $or: [
        { purchase_date: { $regex: currentRegex } },
        { purchase_date: { $gte: currentStartDate, $lte: currentEndDate } }
      ]
    });
    console.log('Current orders found:', currentOrders.length);
    if (currentOrders.length > 0) {
      console.log('Sample order:', JSON.stringify(currentOrders[0], null, 2));
    }

    let breakdown = {}, totalQuantity = 0, totalSales = 0;
    let orderIdsSet = new Set();
    let dateOrderMap = {}; // Track unique orders per date

    currentOrders.forEach(order => {
      // Parse purchase_date from "DD-MMM-YYYY" or "YYYY-MM-DD" format
      let orderDate;
      if (typeof order.purchase_date === 'string') {
        const dateParts = order.purchase_date.split('-');
        if (dateParts.length === 3) {
          if (dateParts[0].length === 4) {
            // "YYYY-MM-DD" format
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const day = parseInt(dateParts[2]);
            orderDate = new Date(Date.UTC(year, month, day));
          } else {
            // "DD-MMM-YYYY" format
            const day = parseInt(dateParts[0]);
            const monthName = dateParts[1];
            const year = parseInt(dateParts[2]);

            const monthNames = {
              'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
              'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };

            const month = monthNames[monthName];
            if (month !== undefined) {
              orderDate = new Date(Date.UTC(year, month, day));
            }
          }
        }
      } else if (order.purchase_date instanceof Date) {
        orderDate = order.purchase_date;
      }

      const key = orderDate ? orderDate.toISOString().split("T")[0] : order.purchase_date;

      const quantity = Number(order.quantity) || 0;
      const sales = Number(order.total_sales || order.totalSales) || 0;
      const orderId = (order.orderID || order.orderId || order.order_id || "").trim();

      if (orderId) orderIdsSet.add(orderId);

      totalQuantity += quantity;
      totalSales += sales;

      if (!breakdown[key]) {
        breakdown[key] = { date: key, totalQuantity: 0, totalSales: 0, orderCount: 0, aov: 0 };
        dateOrderMap[key] = new Set();
      }

      breakdown[key].totalQuantity += quantity;
      breakdown[key].totalSales += sales;

      if (orderId && !dateOrderMap[key].has(orderId)) {
        dateOrderMap[key].add(orderId);
        breakdown[key].orderCount++;
      }
    });

    // Calculate aov for each date item
    Object.keys(breakdown).forEach(key => {
      const item = breakdown[key];
      item.aov = item.orderCount > 0 ? (item.totalSales / item.orderCount) : 0;
      item.aov = Number(item.aov.toFixed(2));
    });

    // Previous period data - handle multiple months for custom ranges and year ranges
    const previousRegex = generateCombinedRegex(previousStartDate, previousEndDate);
    const previousOrders = await Order.find({
      ...query,
      $or: [
        { purchase_date: { $regex: previousRegex } },
        { purchase_date: { $gte: previousStartDate, $lte: previousEndDate } }
      ]
    });

    let prevTotalQuantity = 0, prevTotalSales = 0, prevOrderCount = 0;

    previousOrders.forEach(order => {
      const quantity = Number(order.quantity) || 0;
      const sales = Number(order.total_sales || order.totalSales) || 0;
      const orderId = (order.orderID || order.orderId || order.order_id || "").trim();
      prevTotalQuantity += quantity;
      prevTotalSales += sales;
      if (orderId) prevOrderCount++;
    });

    // Calculate percentage change
    const getPercentChange = (curr, prev) => {
      if (prev === 0) return "N/A";
      const diff = ((curr - prev) / prev) * 100;
      return (diff >= 0 ? diff.toFixed(2) + "% Gain" : diff.toFixed(2) + "% Loss");
    };

    // Calculate AOV
    const currentAOV = orderIdsSet.size > 0 ? totalSales / orderIdsSet.size : 0;
    const previousAOV = prevOrderCount > 0 ? prevTotalSales / prevOrderCount : 0;

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
        data: {
            totalQuantity,
      totalSales,
      totalOrders: orderIdsSet.size,
      aov: currentAOV.toFixed(2),
        items: Object.values(breakdown).sort((a, b) => new Date(a.date) - new Date(b.date)),
              comparison: {
        currentPeriod: { startDate: currentStartDate, endDate: currentEndDate },
        previousPeriod: { startDate: previousStartDate, endDate: previousEndDate },
        previousTotalQuantity: prevTotalQuantity,
        previousTotalSales: prevTotalSales,
        previousTotalOrders: prevOrderCount,
        previousAOV: previousAOV.toFixed(2),
        quantityChangePercent: getPercentChange(totalQuantity, prevTotalQuantity),
        salesChangePercent: getPercentChange(totalSales, prevTotalSales),
        ordersChangePercent: getPercentChange(orderIdsSet.size, prevOrderCount),
        aovChangePercent: getPercentChange(currentAOV, previousAOV),
      }
      },
    });

  } catch (error) {
    console.error('Order service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getDropdownData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { platform, country } = req.query;

    // Create dynamic connection to the specified database
    console.log('Database name for dropdown:', databaseName);

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
    const OrderSchema = new mongoose.Schema({}, { strict: false });
    const Order = dynamicConnection.model("Order", OrderSchema, "orders");

    // Build filter object for platform and country
    const filter = {};
    if (platform) filter.platform = { $regex: platform, $options: 'i' };
    if (country) filter.country = { $regex: country, $options: 'i' };

    // Get distinct SKUs with filters
    const skuList = await Order.distinct('sku', filter);
    const categoryList = await Order.distinct('product_category', filter);

    res.json({
      success: true,
      message: 'Dropdown data retrieved successfully',
      data: {
        skuList: skuList.filter(sku => sku), // Filter out null/undefined
        categoryList: categoryList.filter(category => category) // Filter out null/undefined
      }
    });

  } catch (error) {
    console.error('Dropdown service error:', error);
    res.status(500).json({ error: error.message });
  }
};
