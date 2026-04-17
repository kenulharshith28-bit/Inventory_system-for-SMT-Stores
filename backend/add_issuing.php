<?php
/**
 * Add Issuing Record with Validation and Status Automation
 */
header('Content-Type: application/json');
include "db.php";

$workOrder = $_POST['work_order'] ?? '';
$productId = $_POST['product_id'] ?? '';
$issuedQty = intval($_POST['issued_qty'] ?? 0);
$issuedDate = $_POST['issued_date'] ?? date('Y-m-d');
$issuedNotes = $_POST['issued_notes'] ?? '';
$force = $_POST['force'] ?? 'false';

if (!$workOrder || !$productId || $issuedQty <= 0) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields or invalid quantity']);
    exit;
}

try {
    // 1. Get current totals (Received and Issued)
    $stmt = $conn->prepare("
        SELECT 
            p.mr_qty,
            COALESCE((SELECT SUM(qty) FROM receivings WHERE product_id = p.id), 0) as total_received,
            COALESCE((SELECT SUM(qty) FROM issues WHERE product_id = p.id), 0) as total_issued
        FROM product_information p
        WHERE p.id = ?
    ");
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $productData = $stmt->get_result()->fetch_assoc();
    
    if (!$productData) {
        echo json_encode(['success' => false, 'error' => 'Product not found']);
        exit;
    }

    $totalReceived = intval($productData['total_received']);
    $totalIssued = intval($productData['total_issued']);

    // 2. Check if issuing would exceed received stock (WARNING condition)
    $hasWarning = false;
    $warningMessage = '';
    if ($totalIssued + $issuedQty > $totalReceived && $force !== 'true') {
        $availableStock = $totalReceived - $totalIssued;
        $shortageAmount = ($totalIssued + $issuedQty) - $totalReceived;
        $hasWarning = true;
        $warningMessage = "⚠️ WARNING: Issuing $issuedQty will exceed received stock ($availableStock available). This will create a SHORTAGE of $shortageAmount units.";
        
        // Return warning and EXIT - do NOT save yet
        echo json_encode([
            'success' => false,
            'error' => 'SHORTAGE_WARNING',
            'message' => $warningMessage,
            'available_stock' => $availableStock,
            'shortage_amount' => $shortageAmount
        ]);
        exit;
    }

    // 3. If force='true' OR no shortage warning: INSERT issuing record
    $insertStmt = $conn->prepare("
        INSERT INTO issues (product_id, qty, date, note)
        VALUES (?, ?, ?, ?)
    ");
    $insertStmt->bind_param("iiss", $productId, $issuedQty, $issuedDate, $issuedNotes);
    
    if ($insertStmt->execute()) {
        // 4. Status Automation Logic
        updateWorkOrderStatus($conn, $workOrder);

        echo json_encode([
            'success' => true,
            'message' => 'Issuing record added successfully',
            'new_total_issued' => $totalIssued + $issuedQty
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to add issuing record']);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

/**
 * Update Work Order Status based on Issuing/Receiving
 */
function updateWorkOrderStatus($conn, $workOrder) {
    $stmt = $conn->prepare("
        SELECT 
            SUM(p.mr_qty) as total_mr_qty,
            COALESCE((SELECT SUM(rl.qty) FROM receivings rl JOIN product_information p2 ON rl.product_id = p2.id WHERE p2.work_order = ?), 0) as total_received,
            COALESCE((SELECT SUM(il.qty) FROM issues il JOIN product_information p3 ON il.product_id = p3.id WHERE p3.work_order = ?), 0) as total_issued
        FROM product_information p
        WHERE p.work_order = ?
        GROUP BY p.work_order
    ");
    $stmt->bind_param("sss", $workOrder, $workOrder, $workOrder);
    $stmt->execute();
    $totals = $stmt->get_result()->fetch_assoc();

    if ($totals) {
        $mr = intval($totals['total_mr_qty']);
        $received = intval($totals['total_received']);
        $issued = intval($totals['total_issued']);

        $newStatus = 'created';
        if ($received == 0 && $issued == 0) {
            $newStatus = 'created';
        } elseif ($received === $mr && $issued === $mr) {
            $newStatus = 'done';
        } elseif ($received > 0 && $issued == 0) {
            $newStatus = 'received';
        } elseif ($received > 0 || $issued > 0) {
            $newStatus = 'pending';
        }

        $updateStmt = $conn->prepare("UPDATE header_infor SET status = ? WHERE work_order = ?");
        $updateStmt->bind_param("ss", $newStatus, $workOrder);
        $updateStmt->execute();
    }
}

$conn->close();
?>
