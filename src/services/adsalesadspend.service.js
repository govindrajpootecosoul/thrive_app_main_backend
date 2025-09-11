const mongoose = require('mongoose');

exports.getAdSalesAdSpendByDatabase = async (req, res) => {
  try {
    const {
      platform,
      country,
      filterType = "currentmonth",
      startMonth,
      endMonth,
      sku
    } = req.query;

    const { databaseName } = req.params;

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
    const AdSalesAdSpendSchema = new mongoose.Schema({}, { strict: false });
    const AdSalesAdSpend = dynamicConnection.model("AdSalesAdSpend", AdSalesAdSpendSchema, "ads_sales_and_spend");

    const today = new Date();
    console.log('Today\'s date:', today.toISOString());
    const query = {};

    let currentStartMonth, currentEndMonth;
    let previousStartMonth, previousEndMonth;

    // Use UTC for consistent date handling
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth() + 1; // 1-based for year_month

    // Helper function to parse MM-YYYY format
    const parseMonthYear = (monthYearStr) => {
      if (!monthYearStr || !monthYearStr.includes('-')) return null;
      const [month, year] = monthYearStr.split('-').map(s => parseInt(s.trim()));
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;
      return { month, year };
    };

    // Filter ranges
    if (startMonth && endMonth) {
      // Custom range: MM-YYYY to MM-YYYY
      const startParsed = parseMonthYear(startMonth);
      const endParsed = parseMonthYear(endMonth);

      if (startParsed && endParsed) {
        currentStartMonth = startParsed;
        currentEndMonth = endParsed;

        // Calculate previous period with same duration
        const startDate = new Date(Date.UTC(startParsed.year, startParsed.month - 1, 1));
        const endDate = new Date(Date.UTC(endParsed.year, endParsed.month - 1, 1));
        const durationMonths = (endParsed.year - startParsed.year) * 12 + (endParsed.month - startParsed.month) + 1;
        previousEndMonth = { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1 };
        const prevStartDate = new Date(Date.UTC(previousEndMonth.year, previousEndMonth.month - durationMonths, 1));
        previousStartMonth = { year: prevStartDate.getUTCFullYear(), month: prevStartDate.getUTCMonth() + 1 };
      } else {
        // Invalid format, fallback to current month
        currentStartMonth = { year: currentYear, month: currentMonth };
        currentEndMonth = { year: currentYear, month: currentMonth };
        const prevMonth = currentMonth - 1;
        const prevYear = prevMonth < 1 ? currentYear - 1 : currentYear;
        const adjustedPrevMonth = prevMonth < 1 ? 12 : prevMonth;
        previousStartMonth = { year: prevYear, month: adjustedPrevMonth };
        previousEndMonth = { year: prevYear, month: adjustedPrevMonth };
      }
    } else {
      switch (filterType) {
        case "currentmonth": {
          currentStartMonth = { year: currentYear, month: currentMonth };
          currentEndMonth = { year: currentYear, month: currentMonth };

          const prevMonth = currentMonth - 1;
          const prevYear = prevMonth < 1 ? currentYear - 1 : currentYear;
          const adjustedPrevMonth = prevMonth < 1 ? 12 : prevMonth;
          previousStartMonth = { year: prevYear, month: adjustedPrevMonth };
          previousEndMonth = { year: prevYear, month: adjustedPrevMonth };
          break;
        }
        case "previousmonth": {
          const prevMonth = currentMonth - 1;
          const prevYear = prevMonth < 1 ? currentYear - 1 : currentYear;
          const adjustedPrevMonth = prevMonth < 1 ? 12 : prevMonth;
          currentStartMonth = { year: prevYear, month: adjustedPrevMonth };
          currentEndMonth = { year: prevYear, month: adjustedPrevMonth };

          const monthBeforeLast = adjustedPrevMonth - 1;
          const yearBeforeLast = monthBeforeLast < 1 ? prevYear - 1 : prevYear;
          const adjustedMonthBeforeLast = monthBeforeLast < 1 ? 12 : monthBeforeLast;
          previousStartMonth = { year: yearBeforeLast, month: adjustedMonthBeforeLast };
          previousEndMonth = { year: yearBeforeLast, month: adjustedMonthBeforeLast };
          break;
        }
        case "currentyear": {
          currentStartMonth = { year: currentYear, month: 1 };
          currentEndMonth = { year: currentYear, month: 12 };

          previousStartMonth = { year: currentYear - 1, month: 1 };
          previousEndMonth = { year: currentYear - 1, month: 12 };
          break;
        }
        case "6months":
        default: {
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
        }
      }
    }

    // Filters
    if (platform) query.platform = platform;
    if (country) query.country = country;
    if (sku) query.sku = sku;

    console.log('Final query:', JSON.stringify(query, null, 2));
    console.log('Date range:', { currentStartMonth, currentEndMonth });

    // Helper to generate year_month strings for a range
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

    // Aggregate current period
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

    const currentResult = await AdSalesAdSpend.aggregate(currentPipeline);
    const current = currentResult[0] || { totalAdSales: 0, totalAdSpend: 0, totalRevenue: 0 };

    // Aggregate previous period
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

    const previousResult = await AdSalesAdSpend.aggregate(previousPipeline);
    const previous = previousResult[0] || { totalAdSales: 0, totalAdSpend: 0, totalRevenue: 0 };

    // Calculate metrics
    const calculateMetrics = (data) => {
      const { totalAdSales, totalAdSpend, totalRevenue } = data;
      const ACOS = totalAdSales > 0 ? (totalAdSpend / totalAdSales) * 100 : 0;
      const TACOS = totalRevenue > 0 ? (totalAdSpend / totalRevenue) * 100 : 0;
      const ROAS = totalAdSpend > 0 ? totalAdSales / totalAdSpend : 0;
      const organicrevenue = totalRevenue - totalAdSales;
      return {
        totalAdSales: totalAdSales.toFixed(2),
        totalAdSpend: totalAdSpend.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        ACOS: ACOS.toFixed(2),
        TACOS: TACOS.toFixed(2),
        ROAS: ROAS.toFixed(2),
        organicrevenue: organicrevenue.toFixed(2)
      };
    };

    const currentMetrics = calculateMetrics(current);
    const previousMetrics = calculateMetrics(previous);

    // Calculate change percentages
    const getPercentChange = (curr, prev) => {
      if (prev === 0) return "0.00";
      const diff = ((curr - prev) / prev) * 100;
      return diff.toFixed(2);
    };

    const percent = {
      adSalesChangePercent: getPercentChange(parseFloat(currentMetrics.totalAdSales), parseFloat(previousMetrics.totalAdSales)),
      adSpendChangePercent: getPercentChange(parseFloat(currentMetrics.totalAdSpend), parseFloat(previousMetrics.totalAdSpend)),
      acosChangePercent: getPercentChange(parseFloat(currentMetrics.ACOS), parseFloat(previousMetrics.ACOS)),
      tacosChangePercent: getPercentChange(parseFloat(currentMetrics.TACOS), parseFloat(previousMetrics.TACOS)),
      roasChangePercent: getPercentChange(parseFloat(currentMetrics.ROAS), parseFloat(previousMetrics.ROAS)),
      organicrevenueChangePercent: getPercentChange(parseFloat(currentMetrics.organicrevenue), parseFloat(previousMetrics.organicrevenue))
    };

    res.json({
      success: true,
      message: 'Ad sales and spend data retrieved successfully',
      data: {
        current: currentMetrics,
        previous: previousMetrics,
        percent
      }
    });

  } catch (error) {
    console.error('Ad sales ad spend service error:', error);
    res.status(500).json({ error: error.message });
  }
};
