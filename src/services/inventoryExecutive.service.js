const inventoryData = require('../data_source/All_Geographies_Inventory.json');

exports.getInventoryExecutiveData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { country, platform } = req.query;

    const filter = {};
    if (country) filter.country = country.toLowerCase();
    if (platform) filter.platform = platform.toLowerCase();

    // Filter data
    let filteredData = inventoryData.filter(item => {
      return (!filter.country || item.country.toLowerCase().includes(filter.country)) &&
             (!filter.platform || item.platform.toLowerCase().includes(filter.platform));
    });

    // Aggregate
    let agg = {
      platform: filteredData.length > 0 ? filteredData[0].platform : '',
      estimated_storage_cost_next_month: 0,
      DOS_2: 0,
      afn_warehouse_quantity: 0,
      afn_fulfillable_quantity: 0,
      afn_unsellable_quantity: 0,
      fctransfer: 0,
      customer_reserved: 0,
      fc_processing: 0,
      inv_age_0_to_90_days: 0,
      inv_age_91_to_270_days: 0,
      instock_rate_percent: 0,
      active_sku_out_of_stock_count: 0
    };

    let count = 0;
    filteredData.forEach(item => {
      agg.estimated_storage_cost_next_month += Number(item.estimated_storage_cost_next_month) || 0;
      agg.DOS_2 += Number(item.dos_2) || 0;
      agg.afn_warehouse_quantity += Number(item.afn_warehouse_quantity) || 0;
      agg.afn_fulfillable_quantity += Number(item.afn_fulfillable_quantity) || 0;
      agg.afn_unsellable_quantity += Number(item.afn_unsellable_quantity) || 0;
      agg.fctransfer += Number(item.fc_transfer) || 0;
      agg.customer_reserved += Number(item.customer_reserved) || 0;
      agg.fc_processing += Number(item.fc_processing) || 0;
      agg.inv_age_0_to_90_days += (Number(item.inv_age_0_to_30_days) || 0) + (Number(item.inv_age_31_to_60_days) || 0) + (Number(item.inv_age_61_to_90_days) || 0);
      agg.inv_age_91_to_270_days += (Number(item.inv_age_91_to_180_days) || 0) + (Number(item.inv_age_181_to_270_days) || 0);
      agg.instock_rate_percent += Number(item.instock_rate_percent) || 0;
      if (item.stock_status === "Understock" && item.dos_2 === 0) {
        agg.active_sku_out_of_stock_count += 1;
      }
      count++;
    });

    if (count > 0) {
      agg.DOS_2 /= count;
      agg.instock_rate_percent /= count;
    }

    // Add estimated_storage_cost_previous_month
    if (agg.platform === "amazon") {
      agg.estimated_storage_cost_previous_month = 2506;
    } else if (agg.platform === "shopify") {
      agg.estimated_storage_cost_previous_month = 3078;
    } else {
      agg.estimated_storage_cost_previous_month = 0;
    }

    res.json({
      success: true,
      message: 'Inventory Executive data retrieved successfully',
      data: agg
    });

  } catch (error) {
    console.error('Inventory Executive service error:', error);
    res.status(500).json({ error: error.message });
  }
};
