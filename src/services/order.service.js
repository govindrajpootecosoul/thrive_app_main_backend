const mongoose = require('mongoose');

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
        currentStartDate = new Date(startParsed.year, startParsed.month, 1);
        currentEndDate = new Date(endParsed.year, endParsed.month + 1, 0, 23, 59, 59, 999);

        // Calculate previous period with same duration
        const duration = (currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24) + 1;
        previousEndDate = new Date(currentStartDate.getTime() - 1);
        previousStartDate = new Date(previousEndDate.getTime() - (duration - 1) * 86400000);
      } else {
        // Invalid format, fallback to current month
        currentStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        currentEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        const previousMonth = today.getMonth() - 1;
        const previousYear = previousMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const adjustedPrevMonth = (previousMonth + 12) % 12;
        previousStartDate = new Date(previousYear, adjustedPrevMonth, 1);
        previousEndDate = new Date(previousYear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999);
      }
    } else {
      switch (effectiveFilterType) {
        case "currentmonth": {
          // Current month: from 1st to last day of current month
          currentStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
          currentEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

          // Previous month for comparison
          const previousMonth = today.getMonth() - 1;
          const previousYear = previousMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
          const adjustedPrevMonth = (previousMonth + 12) % 12;

          previousStartDate = new Date(previousYear, adjustedPrevMonth, 1);
          previousEndDate = new Date(previousYear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999);
          break;
        }
        case "previousmonth": {
          // Previous month: full previous month
          const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          currentStartDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
          currentEndDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

          // Month before previous for comparison
          const monthBeforeLast = new Date(today.getFullYear(), today.getMonth() - 2, 1);
          previousStartDate = new Date(monthBeforeLast.getFullYear(), monthBeforeLast.getMonth(), 1);
          previousEndDate = new Date(monthBeforeLast.getFullYear(), monthBeforeLast.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        }
        case "currentyear": {
          // Current year: from Jan 1st to Dec 31st of current year
          currentStartDate = new Date(today.getFullYear(), 0, 1); // January 1st
          currentEndDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999); // December 31st

          // Previous year for comparison
          previousStartDate = new Date(today.getFullYear() - 1, 0, 1); // January 1st of previous year
          previousEndDate = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999); // December 31st of previous year
          break;
        }
        case "6months":
        default: {
          currentStartDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
          currentEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          const duration = (currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24) + 1;
          previousEndDate = new Date(currentStartDate.getTime() - 1);
          previousStartDate = new Date(previousEndDate.getTime() - (duration - 1) * 86400000);
          break;
        }
      }
    }

    // Filters
    if (sku) query.SKU = { $in: sku.split(",").map(s => s.trim()) };
    if (platform) query.platform = platform;
    if (state) query.state = state;
    if (city) query.city = city;
    if (country) query.country = country;

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

      let current = new Date(start.getFullYear(), start.getMonth(), 1);

      while (current <= end) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const monthName = monthNames[month];
        monthPatterns.push(monthName);
        current.setMonth(current.getMonth() + 1);
      }

      // Create combined regex pattern: ^\d{1,2}-(Aug|Sep|Oct)-2025$
      const year = start.getFullYear();
      const monthGroup = monthPatterns.join('|');
      return new RegExp(`^\\d{1,2}-(${monthGroup})-${year}$`);
    };

    const currentRegex = generateCombinedRegex(currentStartDate, currentEndDate);
    const currentOrders = await Order.find({
      ...query,
      purchase_date: { $regex: currentRegex }
    });
    console.log('Current orders found:', currentOrders.length);
    if (currentOrders.length > 0) {
      console.log('Sample order:', JSON.stringify(currentOrders[0], null, 2));
    }

    let breakdown = {}, totalQuantity = 0, totalSales = 0;
    let orderIdsSet = new Set();
    let dateOrderMap = {}; // Track unique orders per date

    currentOrders.forEach(order => {
      // Parse purchase_date from "DD-MMM-YYYY" format
      let orderDate;
      if (typeof order.purchase_date === 'string') {
        // Handle "DD-MMM-YYYY" format
        const dateParts = order.purchase_date.split('-');
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0]);
          const monthName = dateParts[1];
          const year = parseInt(dateParts[2]);

          const monthNames = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };

          const month = monthNames[monthName];
          if (month !== undefined) {
            orderDate = new Date(year, month, day);
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
        breakdown[key] = { date: key, totalQuantity: 0, totalSales: 0, orderCount: 0 };
        dateOrderMap[key] = new Set();
      }

      breakdown[key].totalQuantity += quantity;
      breakdown[key].totalSales += sales;

      if (orderId && !dateOrderMap[key].has(orderId)) {
        dateOrderMap[key].add(orderId);
        breakdown[key].orderCount++;
      }
    });

    // Previous period data - handle multiple months for custom ranges and year ranges
    const previousRegex = generateCombinedRegex(previousStartDate, previousEndDate);
    const previousOrders = await Order.find({
      ...query,
      purchase_date: { $regex: previousRegex }
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

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
        data: {
            totalQuantity,
      totalSales,
      totalOrders: orderIdsSet.size,
        items: Object.values(breakdown),
              comparison: {
        currentPeriod: { startDate: currentStartDate, endDate: currentEndDate },
        previousPeriod: { startDate: previousStartDate, endDate: previousEndDate },
        previousTotalQuantity: prevTotalQuantity,
        previousTotalSales: prevTotalSales,
        previousTotalOrders: prevOrderCount,
        quantityChangePercent: getPercentChange(totalQuantity, prevTotalQuantity),
        salesChangePercent: getPercentChange(totalSales, prevTotalSales),
        ordersChangePercent: getPercentChange(orderIdsSet.size, prevOrderCount),
      }
      },
    });

  } catch (error) {
    console.error('Order service error:', error);
    res.status(500).json({ error: error.message });
  }
};
