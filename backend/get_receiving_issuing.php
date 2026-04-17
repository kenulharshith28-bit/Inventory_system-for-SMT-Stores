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
            COALESCE((SELECT SUM(qty) FROM receivings WHERE product_id = p.id), 0) as total_received,
            COALESCE((SELECT SUM(qty) FROM issues WHERE product_id = p.id), 0) as total_issued
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
    $receiving_over_mr = max(0, $total_received - $mr_qty);
    $receiving_shortage = max(0, $mr_qty - $total_received);
    $issuing_shortage = max(0, $mr_qty - $total_issued);
    $issuing_over_mr = max(0, $total_issued - $mr_qty);
    $isComplete = ($total_received === $mr_qty) && ($total_issued === $mr_qty);

    // 3. Get History
    $receivingStmt = $conn->prepare("SELECT qty as received_qty, date as received_date, note as received_notes FROM receivings WHERE product_id = ? ORDER BY date DESC");
    $receivingStmt->bind_param("i", $productId);
    $receivingStmt->execute();
    $receivingHistory = $receivingStmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $issuingStmt = $conn->prepare("SELECT qty as issued_qty, date as issued_date, note as issued_notes FROM issues WHERE product_id = ? ORDER BY date DESC");
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
            'mr_qty' => $mr_qty,
            'receiving_over_mr' => $receiving_over_mr,
            'receiving_shortage' => $receiving_shortage,
            'issuing_shortage' => $issuing_shortage,
            'issuing_over_mr' => $issuing_over_mr,
            'is_complete' => $isComplete
        ],
        'receiving' => $receivingHistory,
        'issuing' => $issuingHistory,
        'hasShortage' => !$isComplete || $receiving_over_mr > 0 || $issuing_shortage > 0 || $issuing_over_mr > 0
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

$conn->close();
?>
