<?php
/**
 * Update Specific Product
 * 
 * Updates an existing product by product ID.
 * Prevents duplicate products (same item_code, colour, size, unit, mr_qty in same work order).
 */
include "db.php";

$productId = (int)($_POST['product_id'] ?? 0);
$itemCode = trim($_POST['item_code'] ?? '');
$item = trim($_POST['item'] ?? '');
$colour = trim($_POST['colour'] ?? '');
$size = trim($_POST['size'] ?? '');
$unit = trim($_POST['unit'] ?? 'Pcs');
$mrQty = (int)($_POST['mr_qty'] ?? 0);

// Validate product ID and required fields
if ($productId <= 0) {
    die("error: product_id is required");
}
if ($item === '') {
    die("error: item is required");
}

// Get the product and its work order
$getProductStmt = $conn->prepare("SELECT work_order FROM product_information WHERE id = ?");
$getProductStmt->bind_param("i", $productId);
$getProductStmt->execute();
$getProductStmt->bind_result($workOrder);

if (!$getProductStmt->fetch()) {
    $getProductStmt->close();
    die("error: product not found");
}
$getProductStmt->close();

// Check if another product (different ID) has identical matching details in same work order
$checkDuplicateStmt = $conn->prepare("
    SELECT id FROM product_information 
    WHERE work_order = ? AND item_code = ? AND colour = ? AND size = ? AND unit = ? AND mr_qty = ? AND id != ?
    LIMIT 1
");
$checkDuplicateStmt->bind_param("sssssii", $workOrder, $itemCode, $colour, $size, $unit, $mrQty, $productId);
$checkDuplicateStmt->execute();
$duplicateResult = $checkDuplicateStmt->get_result();
$checkDuplicateStmt->close();

if ($duplicateResult->num_rows > 0) {
    die("error: Product with these details already exists in this work order");
}

// Update the product
$updateStmt = $conn->prepare("
    UPDATE product_information
    SET item_code = ?, item = ?, colour = ?, size = ?, unit = ?, mr_qty = ?
    WHERE id = ?
");
$updateStmt->bind_param("sssssii", $itemCode, $item, $colour, $size, $unit, $mrQty, $productId);

if ($updateStmt->execute()) {
    $updateStmt->close();
    echo json_encode([
        'success' => true,
        'message' => 'Product updated successfully',
        'product_id' => $productId
    ]);
} else {
    $updateStmt->close();
    echo json_encode([
        'success' => false,
        'message' => 'error: ' . $conn->error
    ]);
}

?>
