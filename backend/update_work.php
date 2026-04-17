<?php
include "db.php";

$id = (int)($_POST['id'] ?? 0);
$productId = (int)($_POST['product_id'] ?? 0);
$name = trim($_POST['customer_name'] ?? '');
$mrnNo = trim($_POST['mrn_no'] ?? '');
$cutQty = (int)($_POST['cut_qty'] ?? 0);
$location = trim($_POST['location'] ?? '');
$workDate = trim($_POST['work_date'] ?? '');
$status = trim($_POST['status'] ?? 'created');
$itemCode = trim($_POST['item_code'] ?? '');
$item = trim($_POST['item'] ?? '');
$colour = trim($_POST['colour'] ?? '');
$size = trim($_POST['size'] ?? '');
$unit = trim($_POST['unit'] ?? 'Pcs');
$mrQty = (int)($_POST['mr_qty'] ?? 0);

if ($id <= 0) {
    die("error: ID missing");
}

// Get the existing work order - this should NEVER be changed
$workOrderStmt = $conn->prepare("SELECT work_order FROM header_infor WHERE id = ?");
$workOrderStmt->bind_param("i", $id);
$workOrderStmt->execute();
$workOrderStmt->bind_result($existingWorkOrder);

if (!$workOrderStmt->fetch()) {
    $workOrderStmt->close();
    die("error: work order not found");
}
$workOrderStmt->close();

$workOrder = $existingWorkOrder; // Keep original work order - do NOT allow changes

$conn->begin_transaction();

try {
    // Update header info (work_order is protected from changes)
    $headerStmt = $conn->prepare("
        UPDATE header_infor
        SET customer_name = ?, mrn_no = ?, cut_qty = ?, location = ?, work_date = ?, status = ?
        WHERE id = ?
    ");
    if ($workDate === '') {
        $workDate = date("Y-m-d");
    }
    $headerStmt->bind_param("ssisssi", $name, $mrnNo, $cutQty, $location, $workDate, $status, $id);
    $headerStmt->execute();
    $headerStmt->close();

    // Get the specific product row being edited, if provided.
    $productRow = null;
    if ($productId > 0) {
        $checkProductStmt = $conn->prepare("SELECT id, work_order FROM product_information WHERE id = ? AND work_order = ? LIMIT 1");
        $checkProductStmt->bind_param("is", $productId, $workOrder);
        $checkProductStmt->execute();
        $productResult = $checkProductStmt->get_result();
        $productRow = $productResult->fetch_assoc();
        $checkProductStmt->close();
    }

    // If no specific product was supplied, fall back to the first product for this work order.
    if (!$productRow) {
        $checkProductStmt = $conn->prepare("SELECT id, work_order FROM product_information WHERE work_order = ? ORDER BY id ASC LIMIT 1");
        $checkProductStmt->bind_param("s", $workOrder);
        $checkProductStmt->execute();
        $productResult = $checkProductStmt->get_result();
        $productRow = $productResult->fetch_assoc();
        $checkProductStmt->close();
    }

    if ($productRow) {
        // Product exists - check for duplicate before updating
        $targetProductId = (int)$productRow['id'];
        $checkDuplicateStmt = $conn->prepare("
            SELECT id FROM product_information 
            WHERE work_order = ? AND item_code = ? AND colour = ? AND size = ? AND unit = ? AND mr_qty = ? AND id != ?
            LIMIT 1
        ");
        $checkDuplicateStmt->bind_param("sssssii", $workOrder, $itemCode, $colour, $size, $unit, $mrQty, $targetProductId);
        $checkDuplicateStmt->execute();
        $duplicateResult = $checkDuplicateStmt->get_result();
        $checkDuplicateStmt->close();
        
        if ($duplicateResult->num_rows > 0) {
            $conn->rollback();
            die("error: Product with these details already exists in this work order");
        }
        
        $productStmt = $conn->prepare("
            UPDATE product_information
            SET item_code = ?, item = ?, colour = ?, size = ?, unit = ?, mr_qty = ?
            WHERE id = ?
        ");
        $productStmt->bind_param("sssssii", $itemCode, $item, $colour, $size, $unit, $mrQty, $targetProductId);
        $productStmt->execute();
        $productStmt->close();
    } else {
        // No product exists yet for this work order - create one
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
            $conn->rollback();
            die("error: Product with these details already exists in this work order");
        }
        
        $productStmt = $conn->prepare("
            INSERT INTO product_information (work_order, item_code, item, colour, size, unit, mr_qty)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $productStmt->bind_param("ssssssi", $workOrder, $itemCode, $item, $colour, $size, $unit, $mrQty);
        $productStmt->execute();
        $productStmt->close();
    }

    $conn->commit();
    echo "updated";
} catch (Throwable $e) {
    $conn->rollback();
    echo "error: " . $e->getMessage();
}
?>
