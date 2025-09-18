const mongoose = require('mongoose');

exports.getSalesData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const {
      sku,
      productName,
      category,
      city,
      state,
      purchaseHour,
      startDate,
      endDate,
      filterType = "previousmonth",
      country,
      platform
    } = req.query;

    // Create dynamic connection
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

    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const OrderSchema = new mongoose.Schema({}, { strict: false });
    const Order = dynamicConnection.model("Order", OrderSchema, "orders");

    const today = new Date();
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth();

    // Determine the month range
    let months = [];
    if (startDate && endDate) {
      // Custom range
      const [startYear, startMonth] = startDate.split('-').map(Number);
      const [endYear, endMonth] = endDate.split('-').map(Number);
      let current = new Date(Date.UTC(startYear, startMonth - 1, 1));
      const end = new Date(Date.UTC(endYear, endMonth - 1, 1));
      while (current <= end) {
        months.push(current.getUTCMonth() + 1);
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
    } else {
      // Based on filterType for current year
      switch (filterType) {
        case "today":
          months = [currentMonth + 1];
          break;
        case "week":
          months = [currentMonth + 1]; // Approximate
          break;
        case "lastmonth":
          months = [currentMonth]; // Previous month
          break;
        case "year":
          months = Array.from({ length: 12 }, (_, i) => i + 1);
          break;
        case "last30days":
          months = [currentMonth + 1];
          break;
        case "monthtodate":
          months = [currentMonth + 1];
          break;
        case "yeartodate":
          months = Array.from({ length: currentMonth + 1 }, (_, i) => i + 1);
          break;
        case "6months":
          months = [];
          for (let i = 5; i >= 0; i--) {
            const m = currentMonth - i;
            months.push(m < 0 ? m + 12 : m + 1);
          }
          break;
        default:
          months = [currentMonth];
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Build match query
    const baseMatch = {};
    if (sku) baseMatch.sku = { $in: sku.split(',').map(s => s.trim()) };
    if (productName) baseMatch.product_name = { $regex: productName, $options: 'i' };
    if (category) baseMatch.product_category = category;
    if (city) baseMatch.city = city;
    if (state) baseMatch.state = state;
    if (purchaseHour) baseMatch.purchase_hour = parseInt(purchaseHour);
    if (country) baseMatch.country = { $regex: country, $options: 'i' };
    if (platform) baseMatch.platform = { $regex: platform, $options: 'i' };

    // Function to get data for a year
    const getDataForYear = async (year) => {
      const yearMatch = { ...baseMatch };
      const patterns = months.map(m => `${monthNames[m - 1]}-${year}`);
      yearMatch.purchase_date = { $regex: new RegExp(`^\\d{1,2}-(${patterns.join('|')})$`) };

      const pipeline = [
        { $match: yearMatch },
        {
          $project: {
            "purchase-date": "$purchase_date",
            "purchase-hour": "$purchase_hour",
            "purchase-time": "$purchase_time",
            "order-status": "$order_status",
            "SKU": "$sku",
            "Quantity": { $toDouble: "$quantity" },
            "Total_Sales": { $toDouble: "$total_sales" },
            "item-price": { $toDouble: "$item_price" },
            "City": "$city",
            "State": "$state",
            "AOV": { $toDouble: "$aov" },
            "Product Category": "$product_category",
            "Product Name": "$product_name",
            _id: 0
          }
        }
      ];

      return await Order.aggregate(pipeline);
    };

    const data2024 = await getDataForYear(2024);
    const data2025 = await getDataForYear(2025);

    res.json({
      success: true,
      message: 'Sales comparison data retrieved successfully',
      data: {
        "2024": data2024,
        "2025": data2025
      }
    });

  } catch (error) {
    console.error('Sales data service error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Other methods similar, with date regex

exports.getRegionalSales = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const {
      sku,
      filterType = "lastmonth",
      fromDate,
      toDate,
      productCategory,
      state,
      city,
      country,
      platform
    } = req.query;

    // Create dynamic connection
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

    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const OrderSchema = new mongoose.Schema({}, { strict: false });
    const Order = dynamicConnection.model("Order", OrderSchema, "orders");

    const today = new Date();
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth();

    let startDate, endDate, prevStartDate, prevEndDate;

    // Date range logic
    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      // For custom, previous period with same duration
      const duration = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getTime() - duration);
    } else {
      switch (filterType) {
        case "today":
          startDate = new Date(Date.UTC(currentYear, currentMonth, today.getUTCDate()));
          endDate = new Date(Date.UTC(currentYear, currentMonth, today.getUTCDate(), 23, 59, 59, 999));
          prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
          prevEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "week":
          const dayOfWeek = today.getUTCDay();
          startDate = new Date(Date.UTC(currentYear, currentMonth, today.getUTCDate() - dayOfWeek));
          endDate = new Date(Date.UTC(currentYear, currentMonth, today.getUTCDate() + (6 - dayOfWeek), 23, 59, 59, 999));
          prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          prevEndDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "previousmonth":
          const lastMonth = currentMonth - 1;
          const lastMonthYear = lastMonth < 0 ? currentYear - 1 : currentYear;
          const adjustedLastMonth = (lastMonth + 12) % 12;
          startDate = new Date(Date.UTC(lastMonthYear, adjustedLastMonth, 1));
          endDate = new Date(Date.UTC(lastMonthYear, adjustedLastMonth + 1, 0, 23, 59, 59, 999));
          // Previous is the month before lastmonth
          const prevMonth = adjustedLastMonth - 1;
          const prevMonthYear = prevMonth < 0 ? lastMonthYear - 1 : lastMonthYear;
          const adjustedPrevMonth = (prevMonth + 12) % 12;
          prevStartDate = new Date(Date.UTC(prevMonthYear, adjustedPrevMonth, 1));
          prevEndDate = new Date(Date.UTC(prevMonthYear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999));
          break;
        case "year":
          startDate = new Date(Date.UTC(currentYear, 0, 1));
          endDate = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
          prevStartDate = new Date(Date.UTC(currentYear - 1, 0, 1));
          prevEndDate = new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999));
          break;
        case "last30days":
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = new Date(today);
          prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          prevEndDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "currentmonth":
          startDate = new Date(Date.UTC(currentYear, currentMonth, 1));
          endDate = new Date(today);
          // Previous month, same days
          const prevMonthDate = new Date(Date.UTC(currentYear, currentMonth - 1, today.getUTCDate()));
          prevStartDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
          prevEndDate = prevMonthDate;
          break;
        case "currentyear":
          startDate = new Date(Date.UTC(currentYear, 0, 1));
          endDate = new Date(today);
          prevStartDate = new Date(Date.UTC(currentYear - 1, 0, 1));
          prevEndDate = new Date(Date.UTC(currentYear - 1, today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
          break;
        case "6months":
          startDate = new Date(Date.UTC(currentYear, currentMonth - 5, 1));
          endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
          prevStartDate = new Date(Date.UTC(currentYear, currentMonth - 11, 1));
          prevEndDate = new Date(Date.UTC(currentYear, currentMonth - 5, 0, 23, 59, 59, 999));
          break;
        default:
          startDate = new Date(Date.UTC(currentYear, currentMonth - 5, 1));
          endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
          prevStartDate = new Date(Date.UTC(currentYear, currentMonth - 11, 1));
          prevEndDate = new Date(Date.UTC(currentYear, currentMonth - 5, 0, 23, 59, 59, 999));
      }
    }

    // Build match query
    const match = {};
    if (sku) match.sku = { $in: sku.split(',').map(s => s.trim()) };
    if (productCategory) match.product_category = productCategory;
    if (state) match.state = state;
    if (city) match.city = city;
    if (country) match.country = { $regex: country, $options: 'i' };
    if (platform) match.platform = { $regex: platform, $options: 'i' };

    // Date filter using regex
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const generateCombinedRegex = (start, end) => {
      const monthYearPatterns = [];
      let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      const endDate = new Date(end);

      while (current <= endDate) {
        const year = current.getUTCFullYear();
        const month = current.getUTCMonth();
        const monthName = monthNames[month];
        monthYearPatterns.push(`${monthName}-${year}`);
        current.setUTCMonth(current.getUTCMonth() + 1);
      }

      const monthYearGroup = monthYearPatterns.join('|');
      return new RegExp(`^\\d{1,2}-(${monthYearGroup})$`);
    };

    const currentRegex = generateCombinedRegex(startDate, endDate);
    const prevRegex = generateCombinedRegex(prevStartDate, prevEndDate);

    // Regional aggregation for current
    const regionalPipeline = [
      { $match: { ...match, purchase_date: { $regex: currentRegex } } },
      {
        $group: {
          _id: { state: "$state", city: "$city" },
          totalSales: { $sum: { $toDouble: "$total_sales" } },
          totalQuantity: { $sum: { $toDouble: "$quantity" } },
          orderCount: { $addToSet: "$order_id" }
        }
      },
      {
        $project: {
          state: "$_id.state",
          city: "$_id.city",
          totalSales: 1,
          totalQuantity: 1,
          totalOrders: { $size: "$orderCount" },
          _id: 0
        }
      },
      { $sort: { totalSales: -1 } }
    ];

    // Regional for previous
    const prevRegionalPipeline = [
      { $match: { ...match, purchase_date: { $regex: prevRegex } } },
      {
        $group: {
          _id: { state: "$state", city: "$city" },
          totalSales: { $sum: { $toDouble: "$total_sales" } },
          totalQuantity: { $sum: { $toDouble: "$quantity" } },
          orderCount: { $addToSet: "$order_id" }
        }
      },
      {
        $project: {
          state: "$_id.state",
          city: "$_id.city",
          totalSales: 1,
          totalQuantity: 1,
          totalOrders: { $size: "$orderCount" },
          _id: 0
        }
      }
    ];

    // Daily breakdown
    const dailyPipeline = [
      { $match: { ...match, purchase_date: { $regex: currentRegex } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$purchase_date" } },
          sales: { $sum: { $toDouble: "$total_sales" } },
          quantity: { $sum: { $toDouble: "$quantity" } },
          orders: { $addToSet: "$order_id" }
        }
      },
      {
        $project: {
          date: "$_id",
          sales: 1,
          quantity: 1,
          orders: { $size: "$orders" },
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ];

    const regionalResults = await Order.aggregate(regionalPipeline);
    const prevRegionalResults = await Order.aggregate(prevRegionalPipeline);
    const dailyResults = await Order.aggregate(dailyPipeline);

    // Calculate comparison
    const results = regionalResults.map(curr => {
      const prev = prevRegionalResults.find(p => p.state === curr.state && p.city === curr.city) || { totalSales: 0, totalQuantity: 0, totalOrders: 0 };
      const salesChange = prev.totalSales > 0 ? ((curr.totalSales - prev.totalSales) / prev.totalSales * 100).toFixed(2) : 'N/A';
      const quantityChange = prev.totalQuantity > 0 ? ((curr.totalQuantity - prev.totalQuantity) / prev.totalQuantity * 100).toFixed(2) : 'N/A';
      const ordersChange = prev.totalOrders > 0 ? ((curr.totalOrders - prev.totalOrders) / prev.totalOrders * 100).toFixed(2) : 'N/A';

      return {
        ...curr,
        comparison: {
          previousSales: prev.totalSales,
          previousQuantity: prev.totalQuantity,
          previousOrders: prev.totalOrders,
          salesChangePercent: salesChange,
          quantityChangePercent: quantityChange,
          ordersChangePercent: ordersChange
        }
      };
    });

    res.json({
      success: true,
      message: 'Regional sales data retrieved successfully',
      data: {
        regional: results,
        daily: dailyResults
      }
    });

  } catch (error) {
    console.error('Regional sales service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getSkuList = async (req, res) => {
  // Distinct sku
};

exports.getCategoriesList = async (req, res) => {
  // Distinct product_category
};

exports.getProductNames = async (req, res) => {
  // Distinct product_name
};

exports.getStates = async (req, res) => {
  // Distinct state
};

exports.getCitiesByState = async (req, res) => {
  // Distinct city with state filter
};

exports.getSalesComparison = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const {
      sku,
      productName,
      category,
      city,
      state,
      purchaseHour,
      startDate,
      endDate,
      filterType = "lastmonth",
      country,
      platform
    } = req.query;

    // Create dynamic connection
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

    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const OrderSchema = new mongoose.Schema({}, { strict: false });
    const Order = dynamicConnection.model("Order", OrderSchema, "orders");

    const today = new Date();
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth();

    // Determine the month range
    let months = [];
    if (startDate && endDate) {
      // Custom range
      const [startYear, startMonth] = startDate.split('-').map(Number);
      const [endYear, endMonth] = endDate.split('-').map(Number);
      let current = new Date(Date.UTC(startYear, startMonth - 1, 1));
      const end = new Date(Date.UTC(endYear, endMonth - 1, 1));
      while (current <= end) {
        months.push(current.getUTCMonth() + 1);
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
    } else {
      // Based on filterType for current year
      switch (filterType) {
        case "today":
          months = [currentMonth + 1];
          break;
        case "week":
          months = [currentMonth + 1]; // Approximate
          break;
        case "lastmonth":
          months = [currentMonth]; // Previous month
          break;
        case "year":
          months = Array.from({ length: 12 }, (_, i) => i + 1);
          break;
        case "last30days":
          months = [currentMonth + 1];
          break;
        case "monthtodate":
          months = [currentMonth + 1];
          break;
        case "yeartodate":
          months = Array.from({ length: currentMonth + 1 }, (_, i) => i + 1);
          break;
        case "6months":
          months = [];
          for (let i = 5; i >= 0; i--) {
            const m = currentMonth - i;
            months.push(m < 0 ? m + 12 : m + 1);
          }
          break;
        default:
          months = [currentMonth];
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Build match query
    const baseMatch = {};
    if (sku) baseMatch.sku = { $in: sku.split(',').map(s => s.trim()) };
    if (productName) baseMatch.product_name = { $regex: productName, $options: 'i' };
    if (category) baseMatch.product_category = category;
    if (city) baseMatch.city = city;
    if (state) baseMatch.state = state;
    if (purchaseHour) baseMatch.purchase_hour = parseInt(purchaseHour);
    if (country) baseMatch.country = { $regex: country, $options: 'i' };
    if (platform) baseMatch.platform = { $regex: platform, $options: 'i' };

    // Function to get data for a year
    const getDataForYear = async (year) => {
      const yearMatch = { ...baseMatch };
      const patterns = months.map(m => `${monthNames[m - 1]}-${year}`);
      yearMatch.purchase_date = { $regex: new RegExp(`^\\d{1,2}-(${patterns.join('|')})$`) };

      const pipeline = [
        { $match: yearMatch },
        {
          $project: {
            "purchase-date": "$purchase_date",
            "purchase-hour": "$purchase_hour",
            "purchase-time": "$purchase_time",
            "order-status": "$order_status",
            "SKU": "$sku",
            "Quantity": { $toDouble: "$quantity" },
            "Total_Sales": { $toDouble: "$total_sales" },
            "item-price": { $toDouble: "$item_price" },
            "City": "$city",
            "State": "$state",
            "AOV": { $toDouble: "$aov" },
            "Product Category": "$product_category",
            "Product Name": "$product_name",
            _id: 0
          }
        }
      ];

      return await Order.aggregate(pipeline);
    };

    const data2024 = await getDataForYear(2024);
    const data2025 = await getDataForYear(2025);

    res.json({
      success: true,
      message: 'Sales comparison data retrieved successfully',
      data: {
        "2024": data2024,
        "2025": data2025
      }
    });

  } catch (error) {
    console.error('Sales comparison service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAdData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { range = "lastmonth", startDate, endDate, sku, country, platform } = req.query;

    // Dynamic connection
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

    const dynamicConnection = mongoose.createConnection(dynamicUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Use orders collection
    const OrderSchema = new mongoose.Schema({}, { strict: false });
    const AdSalesAdSpendSchema = new mongoose.Schema({}, { strict: false });
    const AdSalesAdSpend = dynamicConnection.model("AdSalesAdSpend", AdSalesAdSpendSchema, "ads_sales_and_spend");

    // Date logic similar to existing adsalesadspend.service.js
    const today = new Date();
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth() + 1;

    let currentStartMonth, currentEndMonth;
    let previousStartMonth, previousEndMonth;

    // Date ranges for month-based
    if (range === "custom" && startDate && endDate) {
      const [startYear, startMonth] = startDate.split('-').map(Number);
      const [endYear, endMonth] = endDate.split('-').map(Number);
      currentStartMonth = { year: startYear, month: startMonth };
      currentEndMonth = { year: endYear, month: endMonth };

      const durationMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      previousEndMonth = { year: startYear, month: startMonth };
      const prevStartDate = new Date(Date.UTC(previousEndMonth.year, previousEndMonth.month - durationMonths, 1));
      previousStartMonth = { year: prevStartDate.getUTCFullYear(), month: prevStartDate.getUTCMonth() + 1 };
    } else {
      switch (range) {
        case "previousmonth":
          const prevMonth = currentMonth - 1;
          const prevYear = prevMonth < 1 ? currentYear - 1 : currentYear;
          const adjustedPrevMonth = prevMonth < 1 ? 12 : prevMonth;
          currentStartMonth = { year: prevYear, month: adjustedPrevMonth };
          currentEndMonth = { year: prevYear, month: adjustedPrevMonth };
          previousStartMonth = { year: prevYear, month: adjustedPrevMonth - 1 || 12 };
          previousEndMonth = { year: prevYear, month: adjustedPrevMonth - 1 || 12 };
          break;
        case "currentyear":
          currentStartMonth = { year: currentYear, month: 1 };
          currentEndMonth = { year: currentYear, month: currentMonth };
          previousStartMonth = { year: currentYear - 1, month: 1 };
          previousEndMonth = { year: currentYear - 1, month: currentMonth };
          break;
        case "last6months":
          const startMonthNum = currentMonth - 5;
          const startYear = startMonthNum < 1 ? currentYear - 1 : currentYear;
          const adjustedStartMonth = startMonthNum < 1 ? startMonthNum + 12 : startMonthNum;
          currentStartMonth = { year: startYear, month: adjustedStartMonth };
          currentEndMonth = { year: currentYear, month: currentMonth };
          const prevEndMonthNum = adjustedStartMonth - 1;
          const prevEndYear = prevEndMonthNum < 1 ? startYear - 1 : startYear;
          const adjustedPrevEndMonth = prevEndMonthNum < 1 ? 12 : prevEndMonthNum;
          previousEndMonth = { year: prevEndYear, month: adjustedPrevEndMonth };
          const prevStartMonthNum = adjustedPrevEndMonth - 5;
          const prevStartYear = prevStartMonthNum < 1 ? prevEndYear - 1 : prevEndYear;
          const adjustedPrevStartMonth = prevStartMonthNum < 1 ? prevStartMonthNum + 12 : prevStartMonthNum;
          previousStartMonth = { year: prevStartYear, month: adjustedPrevStartMonth };
          break;
        case "currentmonth":
          currentStartMonth = { year: currentYear, month: currentMonth };
          currentEndMonth = { year: currentYear, month: currentMonth };
          const prevMonth2 = currentMonth - 1;
          const prevYear2 = prevMonth2 < 1 ? currentYear - 1 : currentYear;
          const adjustedPrevMonth2 = prevMonth2 < 1 ? 12 : prevMonth2;
          previousStartMonth = { year: prevYear2, month: adjustedPrevMonth2 };
          previousEndMonth = { year: prevYear2, month: adjustedPrevMonth2 };
          break;
        case "today":
          // For today, perhaps use current month
          currentStartMonth = { year: currentYear, month: currentMonth };
          currentEndMonth = { year: currentYear, month: currentMonth };
          previousStartMonth = { year: currentYear, month: currentMonth - 1 || 12 };
          previousEndMonth = { year: currentYear, month: currentMonth - 1 || 12 };
          break;
        default:
          currentStartMonth = { year: currentYear, month: currentMonth - 5 };
          currentEndMonth = { year: currentYear, month: currentMonth };
          previousStartMonth = { year: currentYear, month: currentMonth - 11 };
          previousEndMonth = { year: currentYear, month: currentMonth - 6 };
      }
    }

    // Filters
    const query = {};
    if (platform) query.platform = platform;
    if (country) query.country = country;
    if (sku) query.sku = sku;

    // Generate month ranges
    const generateMonthRange = (start, end) => {
      const months = [];
      let current = new Date(Date.UTC(start.year, start.month - 1, 1));
      const endDate = new Date(Date.UTC(end.year, end.month - 1, 1));
      while (current <= endDate) {
        const year = current.getUTCFullYear();
        const month = current.getUTCMonth() + 1;
        months.push(`${year}-${month.toString().padStart(2, '0')}`);
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
      return months;
    };

    const currentMonths = generateMonthRange(currentStartMonth, currentEndMonth);
    const previousMonths = generateMonthRange(previousStartMonth, previousEndMonth);

    // Aggregate current
    const currentPipeline = [
      { $match: { ...query, year_month: { $in: currentMonths } } },
      {
        $group: {
          _id: null,
          totalAdSales: { $sum: { $toDouble: "$ad_sales" } },
          totalAdSpend: { $sum: { $toDouble: "$ad_spend" } },
          totalRevenue: { $sum: { $toDouble: "$total_revenue" } }
        }
      }
    ];

    const currentResult = await Order.aggregate(currentPipeline);
    const current = currentResult[0] || { totalAdSales: 0, totalAdSpend: 0, totalRevenue: 0 };

    // Aggregate previous
    const previousPipeline = [
      { $match: { ...query, year_month: { $in: previousMonths } } },
      {
        $group: {
          _id: null,
          totalAdSales: { $sum: { $toDouble: "$ad_sales" } },
          totalAdSpend: { $sum: { $toDouble: "$ad_spend" } },
          totalRevenue: { $sum: { $toDouble: "$total_revenue" } }
        }
      }
    ];

    const previousResult = await Order.aggregate(previousPipeline);
    const previous = previousResult[0] || { totalAdSales: 0, totalAdSpend: 0, totalRevenue: 0 };

    // Calculate metrics
    const calculateMetrics = (data) => {
      const { totalAdSales, totalAdSpend, totalRevenue } = data;
      const ACOS = totalAdSales > 0 ? (totalAdSpend / totalAdSales) * 100 : 0;
      const TACOS = totalRevenue > 0 ? (totalAdSpend / totalRevenue) * 100 : 0;
      const ROAS = totalAdSpend > 0 ? totalAdSales / totalAdSpend : 0;
      const organicRevenue = totalRevenue - totalAdSales;
      return {
        adSales: totalAdSales.toFixed(2),
        adSpend: totalAdSpend.toFixed(2),
        revenue: totalRevenue.toFixed(2),
        ACOS: ACOS.toFixed(2),
        TACOS: TACOS.toFixed(2),
        ROAS: ROAS.toFixed(2),
        organicRevenue: organicRevenue.toFixed(2)
      };
    };

    const currentMetrics = calculateMetrics(current);
    const previousMetrics = calculateMetrics(previous);

    const getPercentChange = (curr, prev) => {
      if (parseFloat(prev) === 0) return "0.00";
      const diff = ((parseFloat(curr) - parseFloat(prev)) / parseFloat(prev)) * 100;
      return diff.toFixed(2);
    };

    const percent = {
      adSalesChangePercent: getPercentChange(currentMetrics.adSales, previousMetrics.adSales),
      adSpendChangePercent: getPercentChange(currentMetrics.adSpend, previousMetrics.adSpend),
      revenueChangePercent: getPercentChange(currentMetrics.revenue, previousMetrics.revenue),
      acosChangePercent: getPercentChange(currentMetrics.ACOS, previousMetrics.ACOS),
      tacosChangePercent: getPercentChange(currentMetrics.TACOS, previousMetrics.TACOS),
      roasChangePercent: getPercentChange(currentMetrics.ROAS, previousMetrics.ROAS),
      organicRevenueChangePercent: getPercentChange(currentMetrics.organicRevenue, previousMetrics.organicRevenue)
    };

    res.json({
      success: true,
      message: 'Ad data retrieved successfully',
      data: {
        current: currentMetrics,
        previous: previousMetrics,
        percent
      }
    });

  } catch (error) {
    console.error('Ad data service error:', error);
    res.status(500).json({ error: error.message });
  }
};
