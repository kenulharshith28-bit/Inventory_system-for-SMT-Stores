<?php
/**
 * Ignore Shortage for a Product
 */
header('Content-Type: application/json');
include "db.php";

$productId = $_POST['product_id'] ?? '';

if (!$productId) {
    echo json_encode(['success' => false, 'error' => 'Product ID required']);
    exit;
}

try {
    // Add a flag to product_information to mark shortage as ignored
    $stmt = $conn->prepare("
        UPDATE product_information 
        SET shortage_ignored = 1
        WHERE id = ?
    ");
    
    $stmt->bind_param("i", $productId);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Shortage marked as ignored'
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to update']);
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

$conn->close();
?>
