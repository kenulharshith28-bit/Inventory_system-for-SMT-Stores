<?php
/**
 * Add Work Order with Optional Product
 * 
 * Creates a new work order header with optional initial product.
 * If product fields are provided, adds the product as well.
 * Additional products can be added using add_product.php endpoint.
 */
include "db.php";

$name = trim($_POST['customer_name'] ?? '');
$workOrder = trim($_POST['work_order'] ?? '');
$mrnNo = trim($_POST['mrn_no'] ?? '');
$cutQty = (int)($_POST['cut_qty'] ?? 0);
$location = trim($_POST['location'] ?? '');
$workDate = trim($_POST['work_date'] ?? '');
$status = trim($_POST['status'] ?? 'created');
$itemCode = trim($_POST['item_code'] ?? '');
$item = trim($_POST['item'] ?? '');
$colour = trim($_POST['colour'] ?? '');
$size = trim($_POST['size'] ?? '');
$mrQty = (int)($_POST['mr_qty'] ?? 0);

// Validate required fields
if ($name === '' || $workOrder === '') {
    die("error: customer_name and work_order are required fields");
}

if ($workDate === '') {
    $workDate = date("Y-m-d");
}

$conn->begin_transaction();

try {
    // Create work order header
    $headerStmt = $conn->prepare("
        INSERT INTO header_infor (customer_name, work_order, mrn_no, cut_qty, location, work_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $headerStmt->bind_param("sssisss", $name, $workOrder, $mrnNo, $cutQty, $location, $workDate, $status);
    $headerStmt->execute();
    $headerStmt->close();

    // If product details are provided, add the initial product
    if ($item !== '') {
        $unit = trim($_POST['unit'] ?? 'Pcs');
        
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
        
        // If duplicate product found, rollback and return error
        if ($duplicateResult->num_rows > 0) {
            $conn->rollback();
            die("error: Product with these details already exists in this work order");
        }
        
        // Insert product as it's unique
        $productStmt = $conn->prepare("
            INSERT INTO product_information (work_order, item_code, item, colour, size, unit, mr_qty)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $productStmt->bind_param("ssssssi", $workOrder, $itemCode, $item, $colour, $size, $unit, $mrQty);
        $productStmt->execute();
        $productStmt->close();
    }

    $conn->commit();
    echo "added";
} catch (Throwable $e) {
    $conn->rollback();
    echo "error: " . $e->getMessage();
}
?>
