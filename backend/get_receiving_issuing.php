<?php
/**
 * Get Receiving and Issuing History for a Product with Dynamic Calculations
 */
header('Content-Type: application/json');
include "db.php";

$productId = $_GET['product_id'] ?? '';

if (!$productId) {
    echo json_encode(['success' => false, 'error' => 'Product ID required']);
    exit;
}

try {
    // 1. Get Product info and Aggregated Totals
    $productStmt = $conn->prepare("
        SELECT 
            p.id, p.item, p.colour, p.size, p.mr_qty, p.work_order,
            COALESCE((SELECT SUM(received_qty) FROM receiving_log WHERE product_id = p.id), 0) as total_received,
            COALESCE((SELECT SUM(issued_qty) FROM issuing_log WHERE product_id = p.id), 0) as total_issued
        FROM product_information p
        WHERE p.id = ?
    ");
    $productStmt->bind_param("i", $productId);
    $productStmt->execute();
    $product = $productStmt->get_result()->fetch_assoc();

    if (!$product) {
        echo json_encode(['success' => false, 'error' => 'Product not found']);
        exit;
    }

    // 2. Perform requested calculations
    $total_received = intval($product['total_received']);
    $total_issued = intval($product['total_issued']);
    $mr_qty = intval($product['mr_qty']);

    $balance = $total_received - $total_issued;
    $mr_shortage = $mr_qty - $total_issued;

    // 3. Get History
    $receivingStmt = $conn->prepare("SELECT received_qty, received_date, received_notes FROM receiving_log WHERE product_id = ? ORDER BY received_date DESC");
    $receivingStmt->bind_param("i", $productId);
    $receivingStmt->execute();
    $receivingHistory = $receivingStmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $issuingStmt = $conn->prepare("SELECT issued_qty, issued_date, issued_notes FROM issuing_log WHERE product_id = ? ORDER BY issued_date DESC");
    $issuingStmt->bind_param("i", $productId);
    $issuingStmt->execute();
    $issuingHistory = $issuingStmt->get_result()->fetch_all(MYSQLI_ASSOC);

    echo json_encode([
        'success' => true,
        'product' => $product,
        'calculations' => [
            'total_received' => $total_received,
            'total_issued' => $total_issued,
            'balance' => $balance,
            'mr_shortage' => $mr_shortage,
            'mr_qty' => $mr_qty
        ],
        'receiving' => $receivingHistory,
        'issuing' => $issuingHistory,
        'hasShortage' => $mr_shortage > 0
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

$conn->close();
?>
