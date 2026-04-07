<?php
/**
 * Add Product to Existing Work Order
 * 
 * Adds a new product to an existing work order.
 * Prevents duplicate products (same item_code, colour, size, unit, mr_qty in same work order).
 */
include "db.php";

$workOrder = trim($_POST['work_order'] ?? '');
$itemCode = trim($_POST['item_code'] ?? '');
$item = trim($_POST['item'] ?? '');
$colour = trim($_POST['colour'] ?? '');
$size = trim($_POST['size'] ?? '');
$unit = trim($_POST['unit'] ?? 'Pcs');
$mrQty = (int)($_POST['mr_qty'] ?? 0);

// Validate required fields
if ($workOrder === '' || $item === '') {
    die("error: work_order and item are required fields");
}

// Check if work order exists
$checkWorkOrderStmt = $conn->prepare("SELECT id FROM header_infor WHERE work_order = ? LIMIT 1");
$checkWorkOrderStmt->bind_param("s", $workOrder);
$checkWorkOrderStmt->execute();
$workOrderResult = $checkWorkOrderStmt->get_result();
$checkWorkOrderStmt->close();

if ($workOrderResult->num_rows === 0) {
    die("error: work order does not exist");
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
    die("error: Product with these details already exists in this work order");
}

// Insert the new product
$insertStmt = $conn->prepare("
    INSERT INTO product_information (work_order, item_code, item, colour, size, unit, mr_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");
$insertStmt->bind_param("ssssssi", $workOrder, $itemCode, $item, $colour, $size, $unit, $mrQty);

if ($insertStmt->execute()) {
    $productId = $insertStmt->insert_id;
    $insertStmt->close();
    echo json_encode([
        'success' => true,
        'message' => 'Product added successfully',
        'product_id' => $productId
    ]);
} else {
    $insertStmt->close();
    echo json_encode([
        'success' => false,
        'message' => 'error: ' . $conn->error
    ]);
}

?>
