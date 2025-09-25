# Inventory Data Source Change TODO

## Tasks
- [ ] Test inventory APIs to ensure data is fetched correctly from JSON file

## Completed
- [x] Analyze current inventory services and JSON data structure
- [x] Plan the changes to maintain same logic
- [x] Update src/services/inventory.service.js to load JSON data and replace DB logic with array operations for all functions
- [x] Update src/services/inventoryExecutive.service.js to load JSON data and replace DB aggregation with array-based logic

# PNL Data Source Change TODO

## Completed
- [x] Analyze current PNL services and JSON data structure
- [x] Plan the changes to maintain same logic
- [x] Update src/services/pnl.service.js to load JSON data and replace DB logic with array operations for all functions (getPnlData, getPnlExecutiveData, getPnlDropdownData)

# AdSalesAdSpend Data Source Change TODO

## Tasks
- [ ] Analyze current AdSalesAdSpend service and JSON data structure
- [ ] Plan the changes to maintain same logic
- [ ] Update src/services/adsalesadspend.service.js to load JSON data from src/data_source/All_geographies_Ad_Sales_Spend_Gross_Sales.json and replace DB aggregation with array-based filtering and summing for getAdSalesAdSpendByDatabase
- [ ] Test AdSalesAdSpend APIs to ensure data is fetched correctly from JSON file
