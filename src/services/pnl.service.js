const moment = require('moment');
const pnlData = require('../data_source/All_geographies_PNL.json');

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
        message: "Provide a valid range parameter (currentmonths, lastmonth, yeartodate, lastyear) or date/startMonth-endMonth parameters.",
        success: false,
        data: {
          code: "BAD_REQUEST",
          message: "range, date, startMonth, or endMonth is required",
          details: "Provide a valid range parameter (currentmonths, lastmonth, yeartodate, lastyear) or date/startMonth-endMonth parameters."
        },
        timestamp: new Date().toISOString()
      });
    }

    // Date range filters
    const yearMonthFilter = [];
    const now = moment();

    if (date) {
      // Specific date (YYYY-MM)
      yearMonthFilter.push(date);
    } else if (range) {
      switch (range) {
        case 'currentmonth':
          yearMonthFilter.push(now.format('YYYY-MM'));
          break;
        case 'previousmonth':
          yearMonthFilter.push(now.subtract(1, 'month').format('YYYY-MM'));
          break;
        case 'currentyear':
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

    // Filter data
    let filteredData = pnlData.filter(item => {
      // Basic filters
      if (sku && item.sku !== sku) return false;
      if (category && item.product_category !== category) return false;
      if (productName && item.product_name !== productName) return false;
      if (country && item.country !== country) return false;
      if (platform && item.platform !== platform) return false;

      // Date filter
      if (yearMonthFilter.length > 0 && !yearMonthFilter.includes(item.year_month)) return false;

      // CM3 type filter
      if (cm3Type) {
        switch (cm3Type) {
          case 'gainer':
            if (item.cm3 < 0) return false;
            break;
          case 'drainer':
            if (item.cm3 >= 0) return false;
            break;
          case 'all':
            // No filter
            break;
        }
      }

      return true;
    });

    // Group by sku and sum
    const grouped = {};
    filteredData.forEach(item => {
      const key = item.sku;
      if (!grouped[key]) {
        grouped[key] = {
          sku: item.sku,
          product_name: item.product_name,
          product_category: item.product_category,
          country: item.country,
          platform: item.platform,
          year_month: item.year_month,
          ad_cost: 0,
          deal_fee: 0,
          fba_inventory_fee: 0,
          fba_reimbursement: 0,
          liquidations: 0,
          net_sales: 0,
          net_sales_with_tax: 0,
          other_marketing_expenses: 0,
          storage_fee: 0,
          total_return_with_tax: 0,
          total_sales: 0,
          total_sales_with_tax: 0,
          total_units: 0,
          total_return_amount: 0,
          fba_fees: 0,
          promotional_rebates: 0,
          quantity: 0,
          refund_quantity: 0,
          selling_fees: 0,
          spend: 0,
          product_cogs: 0,
          cogs: 0,
          cm1: 0,
          heads_cm2: 0,
          cm2: 0,
          heads_cm3: 0,
          cm3: 0
        };
      }
      grouped[key].ad_cost += Number(item.ad_cost) || 0;
      grouped[key].deal_fee += Number(item.deal_fee) || 0;
      grouped[key].fba_inventory_fee += Number(item.fba_inventory_fee) || 0;
      grouped[key].fba_reimbursement += Number(item.fba_reimbursement) || 0;
      grouped[key].liquidations += Number(item.liquidations) || 0;
      grouped[key].net_sales += Number(item.net_sales) || 0;
      grouped[key].net_sales_with_tax += Number(item.net_sales_with_tax) || 0;
      grouped[key].other_marketing_expenses += Number(item.other_marketing_expenses) || 0;
      grouped[key].storage_fee += Number(item.storage_fee) || 0;
      grouped[key].total_return_with_tax += Number(item.total_return_with_tax) || 0;
      grouped[key].total_sales += Number(item.total_sales) || 0;
      grouped[key].total_sales_with_tax += Number(item.total_sales_with_tax) || 0;
      grouped[key].total_units += Number(item.total_units) || 0;
      grouped[key].total_return_amount += Number(item.total_return_amount) || 0;
      grouped[key].fba_fees += Number(item.fba_fees) || 0;
      grouped[key].promotional_rebates += Number(item.promotional_rebates) || 0;
      grouped[key].quantity += Number(item.quantity) || 0;
      grouped[key].refund_quantity += Number(item.refund_quantity) || 0;
      grouped[key].selling_fees += Number(item.selling_fees) || 0;
      grouped[key].spend += Number(item.spend) || 0;
      grouped[key].product_cogs += Number(item.product_cogs) || 0;
      grouped[key].cogs += Number(item.cogs) || 0;
      grouped[key].cm1 += Number(item.cm1) || 0;
      grouped[key].heads_cm2 += Number(item.heads_cm2) || 0;
      grouped[key].cm2 += Number(item.cm2) || 0;
      grouped[key].heads_cm3 += Number(item.heads_cm3) || 0;
      grouped[key].cm3 += Number(item.cm3) || 0;
    });

    let pnlResult = Object.values(grouped);

    // Sort
    if (sortOrder) {
      switch (sortOrder) {
        case 'ascending':
          pnlResult.sort((a, b) => a.cm3 - b.cm3);
          break;
        case 'descending':
          pnlResult.sort((a, b) => b.cm3 - a.cm3);
          break;
      }
    }

    console.log('Total PNL records found:', pnlResult.length);

    res.json({
      success: true,
      message: 'PNL data retrieved successfully',
      data: {pnlData: pnlResult}
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
        message: "Provide a valid range parameter (currentmonths, lastmonth, yeartodate, lastyear) or date/startMonth-endMonth parameters.",
        success: false,
        data: {
          code: "BAD_REQUEST",
          message: "range, date, startMonth, or endMonth is required",
          details: "Provide a valid range parameter (currentmonths, lastmonth, yeartodate, lastyear) or date/startMonth-endMonth parameters."
        },
        timestamp: new Date().toISOString()
      });
    }

    // Date range filters
    const yearMonthFilter = [];
    const now = moment();

    // Calculate current and previous period filters
    let currentPeriodFilter = [];
    let previousPeriodFilter = [];
    let currentPeriodLabel = '';
    let previousPeriodLabel = '';

    if (date) {
      // Specific date (YYYY-MM)
      currentPeriodFilter.push(date);
      currentPeriodLabel = date;
      // Previous month from specific date
      const dateMoment = moment(date, 'YYYY-MM');
      previousPeriodFilter.push(dateMoment.clone().subtract(1, 'month').format('YYYY-MM'));
      previousPeriodLabel = dateMoment.clone().subtract(1, 'month').format('YYYY-MM');
    } else if (range) {
      switch (range) {
        case 'currentmonth':
          const currentMonthStr = now.format('YYYY-MM');
          const previousMonthStr = now.clone().subtract(1, 'month').format('YYYY-MM');
          currentPeriodFilter.push(currentMonthStr);
          previousPeriodFilter.push(previousMonthStr);
          currentPeriodLabel = currentMonthStr;
          previousPeriodLabel = previousMonthStr;
          yearMonthFilter.push(currentMonthStr);
          break;
        case 'previousmonth':
          const prevMonthStr = now.clone().subtract(1, 'month').format('YYYY-MM');
          const prevPrevMonthStr = now.clone().subtract(2, 'month').format('YYYY-MM');
          currentPeriodFilter.push(prevMonthStr);
          previousPeriodFilter.push(prevPrevMonthStr);
          currentPeriodLabel = prevMonthStr;
          previousPeriodLabel = prevPrevMonthStr;
          yearMonthFilter.push(prevMonthStr);
          break;
        case 'currentyear':
          const currentYear = now.year();
          const currentMonth = now.month() + 1;
          for (let month = 1; month <= currentMonth; month++) {
            yearMonthFilter.push(`${currentYear}-${month.toString().padStart(2, '0')}`);
          }
          currentPeriodLabel = `Current Year (${currentYear})`;
          // Previous year
          const prevYear = currentYear - 1;
          previousPeriodFilter = [];
          for (let month = 1; month <= 12; month++) {
            previousPeriodFilter.push(`${prevYear}-${month.toString().padStart(2, '0')}`);
          }
          previousPeriodLabel = `Previous Year (${prevYear})`;
          break;
        case 'lastyear':
          const lastyear = now.year() - 1;
          for (let month = 1; month <= 12; month++) {
            yearMonthFilter.push(`${lastyear}-${month.toString().padStart(2, '0')}`);
          }
          currentPeriodLabel = `Last Year (${lastyear})`;
          // Previous year (year before last year)
          const prevLastYear = lastyear - 1;
          previousPeriodFilter = [];
          for (let month = 1; month <= 12; month++) {
            previousPeriodFilter.push(`${prevLastYear}-${month.toString().padStart(2, '0')}`);
          }
          previousPeriodLabel = `Previous Year (${prevLastYear})`;
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

      currentPeriodLabel = `${startMonth} to ${endMonth}`;

      // Calculate previous period (same duration before start date)
      const duration = end.diff(start, 'months') + 1;
      const prevStart = start.clone().subtract(duration, 'months');
      const prevEnd = start.clone().subtract(1, 'months');

      let prevCurrent = prevStart.clone();
      while (prevCurrent.isSameOrBefore(prevEnd)) {
        previousPeriodFilter.push(prevCurrent.format('YYYY-MM'));
        prevCurrent.add(1, 'month');
      }

      previousPeriodLabel = `${prevStart.format('YYYY-MM')} to ${prevEnd.format('YYYY-MM')}`;
    }

    // Helper function to sum data
    const sumData = (filteredData) => {
      return filteredData.reduce((acc, item) => {
        acc.ad_cost += Number(item.ad_cost) || 0;
        acc.deal_fee += Number(item.deal_fee) || 0;
        acc.fba_inventory_fee += Number(item.fba_inventory_fee) || 0;
        acc.fba_reimbursement += Number(item.fba_reimbursement) || 0;
        acc.liquidations += Number(item.liquidations) || 0;
        acc.net_sales += Number(item.net_sales) || 0;
        acc.net_sales_with_tax += Number(item.net_sales_with_tax) || 0;
        acc.other_marketing_expenses += Number(item.other_marketing_expenses) || 0;
        acc.storage_fee += Number(item.storage_fee) || 0;
        acc.total_return_with_tax += Number(item.total_return_with_tax) || 0;
        acc.total_sales += Number(item.total_sales) || 0;
        acc.total_sales_with_tax += Number(item.total_sales_with_tax) || 0;
        acc.total_units += Number(item.total_units) || 0;
        acc.total_return_amount += Number(item.total_return_amount) || 0;
        acc.fba_fees += Number(item.fba_fees) || 0;
        acc.promotional_rebates += Number(item.promotional_rebates) || 0;
        acc.quantity += Number(item.quantity) || 0;
        acc.refund_quantity += Number(item.refund_quantity) || 0;
        acc.selling_fees += Number(item.selling_fees) || 0;
        acc.spend += Number(item.spend) || 0;
        acc.product_cogs += Number(item.product_cogs) || 0;
        acc.cogs += Number(item.cogs) || 0;
        acc.cm1 += Number(item.cm1) || 0;
        acc.heads_cm2 += Number(item.heads_cm2) || 0;
        acc.cm2 += Number(item.cm2) || 0;
        acc.heads_cm3 += Number(item.heads_cm3) || 0;
        acc.cm3 += Number(item.cm3) || 0;
        return acc;
      }, {
        ad_cost: 0,
        deal_fee: 0,
        fba_inventory_fee: 0,
        fba_reimbursement: 0,
        liquidations: 0,
        net_sales: 0,
        net_sales_with_tax: 0,
        other_marketing_expenses: 0,
        storage_fee: 0,
        total_return_with_tax: 0,
        total_sales: 0,
        total_sales_with_tax: 0,
        total_units: 0,
        total_return_amount: 0,
        fba_fees: 0,
        promotional_rebates: 0,
        quantity: 0,
        refund_quantity: 0,
        selling_fees: 0,
        spend: 0,
        product_cogs: 0,
        cogs: 0,
        cm1: 0,
        heads_cm2: 0,
        cm2: 0,
        heads_cm3: 0,
        cm3: 0
      });
    };

    let currentPeriodData = null;
    let previousPeriodData = null;
    let comparison = null;

    // Get current period data
    let currentFilteredData = pnlData.filter(item => {
      // Basic filters
      if (sku && item.sku !== sku) return false;
      if (category && item.product_category !== category) return false;
      if (productName && item.product_name !== productName) return false;
      if (country && item.country !== country) return false;
      if (platform && item.platform !== platform) return false;

      // Date filter
      if (yearMonthFilter.length > 0 && !yearMonthFilter.includes(item.year_month)) return false;

      // CM3 type filter
      if (cm3Type) {
        switch (cm3Type) {
          case 'gainer':
            if (item.cm3 < 0) return false;
            break;
          case 'drainer':
            if (item.cm3 >= 0) return false;
            break;
          case 'all':
            // No filter
            break;
        }
      }

      return true;
    });

    currentPeriodData = sumData(currentFilteredData);

    // Always get previous period data for comparison
    if (previousPeriodFilter.length > 0) {
      let previousFilteredData = pnlData.filter(item => {
        // Basic filters
        if (sku && item.sku !== sku) return false;
        if (category && item.product_category !== category) return false;
        if (productName && item.product_name !== productName) return false;
        if (country && item.country !== country) return false;
        if (platform && item.platform !== platform) return false;

        // Date filter for previous period
        if (!previousPeriodFilter.includes(item.year_month)) return false;

        // CM3 type filter
        if (cm3Type) {
          switch (cm3Type) {
            case 'gainer':
              if (item.cm3 < 0) return false;
              break;
            case 'drainer':
              if (item.cm3 >= 0) return false;
              break;
            case 'all':
              // No filter
              break;
          }
        }

        return true;
      });

      previousPeriodData = sumData(previousFilteredData);

      // Calculate comparison metrics
      const calculatePercentChange = (current, previous) => {
        if (!previous || previous === 0) return "N/A";
        const diff = ((current - previous) / previous) * 100;
        return (diff >= 0 ? diff.toFixed(2) : diff.toFixed(2));
      };

      comparison = {
        cm1_change: calculatePercentChange(currentPeriodData.cm1, previousPeriodData.cm1),
        cm2_change: calculatePercentChange(currentPeriodData.cm2, previousPeriodData.cm2),
        cm3_change: calculatePercentChange(currentPeriodData.cm3, previousPeriodData.cm3),
      };
    }

    const response = {
      success: true,
      message: 'PNL Executive data retrieved successfully',
      data: {
        currentPeriod: currentPeriodData,
        ...(previousPeriodData && {
          previousPeriod: previousPeriodData,
          comparison: comparison
        })
      }
    };

    res.json(response);

  } catch (error) {
    console.error('PNL Executive service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPnlDropdownData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { country, platform } = req.query;

    // Filter data if country or platform provided
    let filteredData = pnlData;
    if (country && country.trim() !== '') {
      filteredData = filteredData.filter(item => item.country === country);
    }
    if (platform && platform.trim() !== '') {
      filteredData = filteredData.filter(item => item.platform === platform);
    }

    // Get distinct values using Set
    const skuSet = new Set();
    const categorySet = new Set();
    const productNameSet = new Set();
    const countrySet = new Set();
    const platformSet = new Set();

    filteredData.forEach(item => {
      skuSet.add(item.sku);
      categorySet.add(item.product_category);
      productNameSet.add(item.product_name);
      countrySet.add(item.country);
      platformSet.add(item.platform);
    });

    const dropdownData = {
      skuList: Array.from(skuSet),
      categoryList: Array.from(categorySet),
      productNameList: Array.from(productNameSet),
      countryList: Array.from(countrySet),
      platformList: Array.from(platformSet)
    };

    if (dropdownData.skuList.length === 0) {
      return res.json({
        success: false,
        message: 'No data found matching the provided filters',
        data: { skuList: [], categoryList: [], productNameList: [], countryList: [], platformList: [] }
      });
    }

    res.json({
      success: true,
      message: 'PNL Dropdown data retrieved successfully',
      data: dropdownData
    });

  } catch (error) {
    console.error('PNL Dropdown service error:', error);
    res.status(500).json({ error: error.message });
  }
};
