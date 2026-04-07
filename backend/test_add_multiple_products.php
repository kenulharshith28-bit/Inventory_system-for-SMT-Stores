<?php
/**
 * Test Script - Add Multiple Products at Once
 * 
 * This demonstrates how to use the add_multiple_products.php endpoint
 * to add multiple products to a work order in a single request.
 * 
 * Usage:
 * 1. Update $workOrder variable to an existing work order ID
 * 2. Run: php test_add_multiple_products.php
 */

// Simulate POST request with JSON data
$workOrderId = 'WO001'; // Change to your work order ID

$productsData = [
    'work_order' => $workOrderId,
    'products' => [
        [
            'item' => 'T-Shirt',
            'item_code' => 'TS001',
            'colour' => 'Red',
            'size' => 'M',
            'unit' => 'Pcs',
            'mr_qty' => 50
        ],
        [
            'item' => 'Jeans',
            'item_code' => 'J001',
            'colour' => 'Blue',
            'size' => 'L',
            'unit' => 'Pcs',
            'mr_qty' => 30
        ],
        [
            'item' => 'Socks',
            'item_code' => 'SO001',
            'colour' => 'Black',
            'size' => 'One Size',
            'unit' => 'Pair',
            'mr_qty' => 100
        ],
        [
            'item' => 'Hat',
            'item_code' => 'H001',
            'colour' => 'White',
            'size' => 'One Size',
            'unit' => 'Pcs',
            'mr_qty' => 25
        ]
    ]
];

// Convert to JSON
$jsonData = json_encode($productsData);

// Use curl to send POST request
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => 'http://localhost/Stores/backend/add_multiple_products.php',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $jsonData,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($jsonData)
    ]
]);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

echo "HTTP Status: " . $httpCode . "\n";
echo "Response:\n";
echo json_encode(json_decode($response), JSON_PRETTY_PRINT) . "\n";

?>
