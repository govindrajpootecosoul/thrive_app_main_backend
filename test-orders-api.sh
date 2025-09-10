#!/bin/bash

# Orders API Test Script
# Database: TH-1753144646395
BASE_URL="http://localhost:3000/api/users/orders/TH-1753144646395"

echo "=== Orders API Test Script ==="
echo "Database: TH-1753144646395"
echo ""

# 1. Basic filterType tests
echo "1. Testing filterType options:"
echo ""

echo "Current Month:"
curl -X GET "$BASE_URL?filterType=currentmonth" | jq '.'
echo -e "\n"

echo "Previous Month:"
curl -X GET "$BASE_URL?filterType=previousmonth" | jq '.'
echo -e "\n"

echo "Current Year:"
curl -X GET "$BASE_URL?filterType=currentyear" | jq '.'
echo -e "\n"

echo "6 Months:"
curl -X GET "$BASE_URL?filterType=6months" | jq '.'
echo -e "\n"

# 2. SKU filtering
echo "2. Testing SKU filtering:"
echo ""

echo "Single SKU:"
curl -X GET "$BASE_URL?filterType=currentmonth&sku=ABC123" | jq '.'
echo -e "\n"

echo "Multiple SKUs:"
curl -X GET "$BASE_URL?filterType=currentmonth&sku=ABC123,DEF456,GHI789" | jq '.'
echo -e "\n"

# 3. Platform filtering
echo "3. Testing Platform filtering:"
echo ""

echo "Amazon Platform:"
curl -X GET "$BASE_URL?filterType=currentmonth&platform=amazon" | jq '.'
echo -e "\n"

echo "Flipkart Platform:"
curl -X GET "$BASE_URL?filterType=currentmonth&platform=flipkart" | jq '.'
echo -e "\n"

# 4. State filtering
echo "4. Testing State filtering:"
echo ""

echo "Maharashtra State:"
curl -X GET "$BASE_URL?filterType=currentmonth&state=Maharashtra" | jq '.'
echo -e "\n"

echo "Delhi State:"
curl -X GET "$BASE_URL?filterType=currentmonth&state=Delhi" | jq '.'
echo -e "\n"

# 5. City filtering
echo "5. Testing City filtering:"
echo ""

echo "Mumbai City:"
curl -X GET "$BASE_URL?filterType=currentmonth&city=Mumbai" | jq '.'
echo -e "\n"

echo "Delhi City:"
curl -X GET "$BASE_URL?filterType=currentmonth&city=Delhi" | jq '.'
echo -e "\n"

# 6. Country filtering
echo "6. Testing Country filtering:"
echo ""

echo "UK Country:"
curl -X GET "$BASE_URL?filterType=currentmonth&country=UK" | jq '.'
echo -e "\n"

echo "USA Country:"
curl -X GET "$BASE_URL?filterType=currentmonth&country=USA" | jq '.'
echo -e "\n"

# 7. Combined filters
echo "7. Testing Combined filters:"
echo ""

echo "SKU + Platform:"
curl -X GET "$BASE_URL?filterType=currentmonth&sku=ABC123&platform=amazon" | jq '.'
echo -e "\n"

echo "SKU + State + City:"
curl -X GET "$BASE_URL?filterType=currentmonth&sku=ABC123&state=Maharashtra&city=Mumbai" | jq '.'
echo -e "\n"

echo "Platform + State + City:"
curl -X GET "$BASE_URL?filterType=currentmonth&platform=amazon&state=Maharashtra&city=Mumbai" | jq '.'
echo -e "\n"

echo "All filters combined:"
curl -X GET "$BASE_URL?filterType=currentmonth&sku=ABC123,DEF456&platform=amazon&state=Maharashtra&city=Mumbai" | jq '.'
echo -e "\n"

# 7. Custom date range
echo "7. Testing Custom date range:"
echo ""

echo "Custom Month Range (08-2025 to 09-2025):"
curl -X GET "$BASE_URL?startMonth=08-2025&endMonth=09-2025" | jq '.'
echo -e "\n"

echo "Custom Year Range (01-2025 to 12-2025):"
curl -X GET "$BASE_URL?startMonth=01-2025&endMonth=12-2025" | jq '.'
echo -e "\n"

# 8. Custom range with filters
echo "8. Testing Custom range with filters:"
echo ""

echo "Custom range + SKU:"
curl -X GET "$BASE_URL?startMonth=08-2025&endMonth=09-2025&sku=ABC123" | jq '.'
echo -e "\n"

echo "Custom range + Platform + State:"
curl -X GET "$BASE_URL?startMonth=08-2025&endMonth=09-2025&platform=amazon&state=Maharashtra" | jq '.'
echo -e "\n"

# 9. Error handling tests
echo "9. Testing Error handling:"
echo ""

echo "Invalid filterType:"
curl -X GET "$BASE_URL?filterType=invalid" | jq '.'
echo -e "\n"

echo "Invalid date format:"
curl -X GET "$BASE_URL?startMonth=invalid&endMonth=09-2025" | jq '.'
echo -e "\n"

echo "Empty database name:"
curl -X GET "http://localhost:3000/api/users/orders/?filterType=currentmonth" | jq '.'
echo -e "\n"

echo "=== Test Complete ==="
