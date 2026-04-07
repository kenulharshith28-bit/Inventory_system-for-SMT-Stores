<?php
/**
 * Add Multiple Products to Existing Work Order
 * 
 * Adds multiple products to an existing work order in a single request.
 * Prevents duplicate products (same item_code, colour, size, unit, mr_qty in same work order).
 * 
 * Expected POST data:
 * {
 *   "work_order": "WO001",
 *   "products": [
 *     {
 *       "item": "Shirt",
 *       "item_code": "SH001",
 *       "colour": "Blue",
 *       "size": "M",
 *       "unit": "Pcs",
 *       "mr_qty": 10
 *     },
 *     {
 *       "item": "Pants",
 *       "item_code": "P001",
 *       "colour": "Black",
 *       "size": "L",
 *       "unit": "Pcs",
 *       "mr_qty": 5
 *     }
 *   ]
 * }
 */
include "db.php";

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$workOrder = trim($data['work_order'] ?? '');
$products = $data['products'] ?? [];

// Validate work order
if ($workOrder === '') {
    die(json_encode([
        'success' => false,
        'message' => 'error: work_order is required',
        'products_added' => 0,
        'failures' => []
    ]));
}

// Validate products array
if (!is_array($products) || empty($products)) {
    die(json_encode([
        'success' => false,
        'message' => 'error: products array is required and must not be empty',
        'products_added' => 0,
        'failures' => []
    ]));
}

// Check if work order exists
$checkWorkOrderStmt = $conn->prepare("SELECT id FROM header_infor WHERE work_order = ? LIMIT 1");
$checkWorkOrderStmt->bind_param("s", $workOrder);
$checkWorkOrderStmt->execute();
$workOrderResult = $checkWorkOrderStmt->get_result();
$checkWorkOrderStmt->close();

if ($workOrderResult->num_rows === 0) {
    die(json_encode([
        'success' => false,
        'message' => 'error: work order does not exist',
        'products_added' => 0,
        'failures' => []
    ]));
}

$conn->begin_transaction();
$productsAdded = 0;
$failures = [];

try {
    foreach ($products as $index => $product) {
        $itemCode = trim($product['item_code'] ?? '');
        $item = trim($product['item'] ?? '');
        $colour = trim($product['colour'] ?? '');
        $size = trim($product['size'] ?? '');
        $unit = trim($product['unit'] ?? 'Pcs');
        $mrQty = (int)($product['mr_qty'] ?? 0);

        // Validate required fields
        if ($item === '') {
            $failures[] = [
                'index' => $index,
                'error' => 'Item name is required'
            ];
            continue;
        }

        // Check if product with matching details already exists in this work order
        $checkDuplicateStmt = $conn->prepare("
            SELECT id FROM product_information 
            WHERE work_order = ? AND item_code = ? AND colour = ? AND size = ? AND unit = ? AND mr_qty = ?
            LIMIT 1
        ");
        $checkDuplicateStmt->bind_param("sssssi", $workOrder, $itemCode, $colour, $size, $unit, $mrQty);
        $checkDuplicateStmt->execute();
        $duplicateResult = $checkDuplicateStmt->get_result();
        $checkDuplicateStmt->close();

        if ($duplicateResult->num_rows > 0) {
            $failures[] = [
                'index' => $index,
                'item' => $item,
                'error' => 'Product with these details already exists in this work order'
            ];
            continue;
        }

        // Insert the product
        $insertStmt = $conn->prepare("
            INSERT INTO product_information (work_order, item_code, item, colour, size, unit, mr_qty)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $insertStmt->bind_param("ssssssi", $workOrder, $itemCode, $item, $colour, $size, $unit, $mrQty);
        
        if ($insertStmt->execute()) {
            $productsAdded++;
        } else {
            $failures[] = [
                'index' => $index,
                'item' => $item,
                'error' => 'Database error: ' . $insertStmt->error
            ];
        }
        $insertStmt->close();
    }

    $conn->commit();
    
    // If all products were added successfully
    if (empty($failures)) {
        echo json_encode([
            'success' => true,
            'message' => $productsAdded . ' product(s) added successfully',
            'products_added' => $productsAdded,
            'failures' => []
        ]);
    } else if ($productsAdded > 0) {
        // Partial success - some products added, some failed
        echo json_encode([
            'success' => true,
            'message' => $productsAdded . ' product(s) added with ' . count($failures) . ' failure(s)',
            'products_added' => $productsAdded,
            'failures' => $failures
        ]);
    } else {
        // Complete failure - no products added
        echo json_encode([
            'success' => false,
            'message' => 'Failed to add products',
            'products_added' => 0,
            'failures' => $failures
        ]);
    }
} catch (Throwable $e) {
    $conn->rollback();
    echo json_encode([
        'success' => false,
        'message' => 'error: ' . $e->getMessage(),
        'products_added' => 0,
        'failures' => []
    ]);
}

?>
