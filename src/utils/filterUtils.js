/**
 * Utility functions for building filters and date ranges for order queries
 */

/**
 * Builds a filter object from query parameters
 * @param {Object} query - The query parameters
 * @returns {Object} - The filter object
 */
exports.buildOrderFilter = (query) => {
  const filter = {};

  // Basic filters
  if (query.sku) filter.sku = query.sku;
  if (query.product_category) filter.product_category = query.product_category;
  if (query.product_name) filter.product_name = query.product_name;
  if (query.platform) filter.platform = { $regex: query.platform, $options: 'i' };
  if (query.country) filter.country = { $regex: query.country, $options: 'i' };
  if (query.state) filter.state = query.state;
  if (query.city) filter.city = query.city;

  return filter;
};

/**
 * Calculates date ranges based on filter type and custom dates
 * @param {Object} query - The query parameters containing filterType, fromDate, toDate, startMonth, endMonth
 * @returns {Object} - Object containing currentStartDate, currentEndDate, and optionally previousStartDate, previousEndDate
 */
exports.calculateDateRanges = (query) => {
  const { filterType, fromDate, toDate, startMonth, endMonth } = query;

  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth();

  let currentStartDate, currentEndDate, previousStartDate, previousEndDate;

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

      // Calculate previous period with same duration for comparison
      const duration = (currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24) + 1;
      previousEndDate = new Date(currentStartDate.getTime() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - (duration - 1) * 86400000);
    } else {
      // Invalid format, fallback to current month
      currentStartDate = new Date(Date.UTC(currentYear, currentMonth, 1));
      currentEndDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
      const previousMonth = currentMonth - 1;
      const lastyear = previousMonth < 0 ? currentYear - 1 : currentYear;
      const adjustedPrevMonth = (previousMonth + 12) % 12;
      previousStartDate = new Date(Date.UTC(lastyear, adjustedPrevMonth, 1));
      previousEndDate = new Date(Date.UTC(lastyear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999));
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

        // Previous month for comparison
        const previousMonth = currentMonth - 1;
        const lastyear = previousMonth < 0 ? currentYear - 1 : currentYear;
        const adjustedPrevMonth = (previousMonth + 12) % 12;
        previousStartDate = new Date(Date.UTC(lastyear, adjustedPrevMonth, 1));
        previousEndDate = new Date(Date.UTC(lastyear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999));
        break;
      }
      case "previousmonth": {
        // Previous month: full previous month
        const previousMonth = currentMonth - 1;
        const lastyear = previousMonth < 0 ? currentYear - 1 : currentYear;
        const adjustedPrevMonth = (previousMonth + 12) % 12;
        currentStartDate = new Date(Date.UTC(lastyear, adjustedPrevMonth, 1));
        currentEndDate = new Date(Date.UTC(lastyear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999));

        // Month before previous for comparison
        const monthBeforeLast = adjustedPrevMonth - 1;
        const yearBeforeLast = monthBeforeLast < 0 ? lastyear - 1 : lastyear;
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
      case "lastyear": {
        // Previous year: from Jan 1st to Dec 31st of previous year
        currentStartDate = new Date(Date.UTC(currentYear - 1, 0, 1)); // January 1st of previous year
        currentEndDate = new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999)); // December 31st of previous year

        // Year before previous for comparison
        previousStartDate = new Date(Date.UTC(currentYear - 2, 0, 1)); // January 1st of year before previous
        previousEndDate = new Date(Date.UTC(currentYear - 2, 11, 31, 23, 59, 59, 999)); // December 31st of year before previous
        break;
      }
      default: {
        throw new Error(`Invalid filterType: ${filterType}. Provide a valid filterType such as currentmonth, previousmonth, currentyear, or lastyear.`);
      }
    }
  }

  return { currentStartDate, currentEndDate, previousStartDate, previousEndDate };
};

/**
 * Generates a combined regex pattern for date filtering
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {RegExp} - Combined regex pattern
 */
exports.generateCombinedRegex = (startDate, endDate) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

/**
 * Validates required filter parameters
 * @param {Object} query - The query parameters
 * @throws {Error} - If validation fails
 */
exports.validateFilterParams = (query) => {
  if (!query.filterType && !query.fromDate && !query.startMonth) {
    throw new Error("Provide a valid filterType query parameter or body field, or use fromDate/toDate or startMonth/endMonth.");
  }
};
