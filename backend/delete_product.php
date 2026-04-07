<?php
/**
 * Delete Specific Product
 * 
 * Deletes a product by product ID from a work order.
 */
include "db.php";

$productId = (int)($_POST['product_id'] ?? $_GET['id'] ?? 0);

if ($productId <= 0) {
    die("error: product_id is required");
}

$stmt = $conn->prepare("DELETE FROM product_information WHERE id = ?");
$stmt->bind_param("i", $productId);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        $stmt->close();
        echo json_encode([
            'success' => true,
            'message' => 'Product deleted successfully',
            'product_id' => $productId
        ]);
    } else {
        $stmt->close();
        die("error: product not found");
    }
} else {
    $stmt->close();
    die("error: " . $conn->error);
}

?>
