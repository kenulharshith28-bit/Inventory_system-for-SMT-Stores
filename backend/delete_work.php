<?php
/**
 * Delete Work Order
 * 
 * Deletes a work order header and all associated products.
 */
include "db.php";

$id = (int)($_GET['id'] ?? 0);

if ($id <= 0) {
    die("error: ID missing");
}

$conn->begin_transaction();

try {
    // Get the work order number to identify all its products
    $getWorkOrderStmt = $conn->prepare("SELECT work_order FROM header_infor WHERE id = ?");
    $getWorkOrderStmt->bind_param("i", $id);
    $getWorkOrderStmt->execute();
    $getWorkOrderStmt->bind_result($workOrder);
    
    if (!$getWorkOrderStmt->fetch()) {
        $getWorkOrderStmt->close();
        $conn->rollback();
        die("error: work order not found");
    }
    $getWorkOrderStmt->close();
    
    // Delete all products associated with this work order
    $deleteProductsStmt = $conn->prepare("DELETE FROM product_information WHERE work_order = ?");
    $deleteProductsStmt->bind_param("s", $workOrder);
    $deleteProductsStmt->execute();
    $deleteProductsStmt->close();
    
    // Delete the work order header
    $deleteHeaderStmt = $conn->prepare("DELETE FROM header_infor WHERE id = ?");
    $deleteHeaderStmt->bind_param("i", $id);
    $deleteHeaderStmt->execute();
    $deleteHeaderStmt->close();
    
    $conn->commit();
    echo "deleted";
} catch (Throwable $e) {
    $conn->rollback();
    echo "error: " . $e->getMessage();
}

?>
