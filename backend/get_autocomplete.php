<?php
/**
 * Get Autocomplete Suggestions for Forms
 * Returns master data organized by type for autocomplete functionality
 */
header('Content-Type: application/json');
include "db.php";

try {
    // Get all customers
    $customerSql = "SELECT DISTINCT value as customer_name FROM master_data WHERE type = 'customer' AND value IS NOT NULL AND value <> '' ORDER BY value ASC LIMIT 100";
    $customerResult = $conn->query($customerSql);
    $customers = [];
    while ($row = $customerResult->fetch_assoc()) {
        $customers[] = $row;
    }
    
    // Get all items
    $itemSql = "SELECT DISTINCT value as item FROM master_data WHERE type = 'item' AND value IS NOT NULL AND value <> '' ORDER BY value ASC LIMIT 100";
    $itemResult = $conn->query($itemSql);
    $items = [];
    while ($row = $itemResult->fetch_assoc()) {
        $items[] = $row;
    }
    
    // Get all sizes
    $sizeSql = "SELECT DISTINCT value as size FROM master_data WHERE type = 'size' AND value IS NOT NULL AND value <> '' ORDER BY value ASC LIMIT 100";
    $sizeResult = $conn->query($sizeSql);
    $sizes = [];
    while ($row = $sizeResult->fetch_assoc()) {
        $sizes[] = $row;
    }
    
    // Get all colours from products
    $colourSql = "SELECT DISTINCT colour FROM product_information WHERE colour IS NOT NULL AND colour != '' ORDER BY colour ASC LIMIT 100";
    $colourResult = $conn->query($colourSql);
    $colours = [];
    while ($row = $colourResult->fetch_assoc()) {
        $colours[] = array('colour' => $row['colour']);
    }
    
    // Get all item codes from products
    $codeSql = "SELECT DISTINCT item_code FROM product_information WHERE item_code IS NOT NULL AND item_code != '' ORDER BY item_code ASC LIMIT 100";
    $codeResult = $conn->query($codeSql);
    $itemCodes = [];
    while ($row = $codeResult->fetch_assoc()) {
        $itemCodes[] = array('item_code' => $row['item_code']);
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'customers' => $customers,
            'items' => $items,
            'sizes' => $sizes,
            'colours' => $colours,
            'itemCodes' => $itemCodes
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>
