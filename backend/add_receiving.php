<?php
/**
 * Add Receiving Record - Permissive with Validation
 */
header('Content-Type: application/json');
include "db.php";

$workOrder = $_POST['work_order'] ?? '';
$productId = $_POST['product_id'] ?? '';
$receivedQty = intval($_POST['received_qty'] ?? 0);
$receivedDate = $_POST['received_date'] ?? date('Y-m-d');
$receivedNotes = $_POST['received_notes'] ?? '';
$force = $_POST['force'] ?? 'false'; 

if (!$workOrder || !$productId || $receivedQty <= 0) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields or invalid quantity']);
    exit;
}

try {
    // 1. Get current totals and MR Qty
    $stmt = $conn->prepare("
        SELECT 
            p.mr_qty,
            COALESCE((SELECT SUM(qty) FROM receivings WHERE product_id = p.id), 0) as total_received
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

    $mrQty = intval($productData['mr_qty']);
    $totalReceived = intval($productData['total_received']);

    // 2. Logic: Check if receiving reaches/exceeds MR Qty - NOTIFY but ALLOW if force=true
    if ($totalReceived + $receivedQty >= $mrQty && $force !== 'true') {
        $newTotal = $totalReceived + $receivedQty;
        echo json_encode([
            'success' => false, 
            'error' => 'MR_FULFILLED',
            'message' => "ℹ️ INFO: Adding $receivedQty will reach/exceed MR Qty ($mrQty). Total will be $newTotal. Continue to fulfill MR?",
            'limit' => $mrQty,
            'current' => $totalReceived,
            'new_total' => $newTotal
        ]);
        exit;
    }

    // 3. Insert receiving record
    $insertStmt = $conn->prepare("
        INSERT INTO receivings (product_id, qty, date, note)
        VALUES (?, ?, ?, ?)
    ");
    $insertStmt->bind_param("iiss", $productId, $receivedQty, $receivedDate, $receivedNotes);
    
    if ($insertStmt->execute()) {
        updateWorkOrderStatus($conn, $workOrder);

        echo json_encode([
            'success' => true,
            'message' => 'Receiving record added successfully',
            'new_total_received' => $totalReceived + $receivedQty
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to add receiving record']);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

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

        // CORRECT Status Logic:
        // - created: No receiving or issuing
        // - received: Has receiving, no issuing yet
        // - pending: Has issuing but not all has been issued
        // - done: All issued equals all received (balanced)
        
        $newStatus = 'created';
        if ($received == 0 && $issued == 0) {
            $newStatus = 'created';
        } elseif ($received > 0 && $issued == 0) {
            $newStatus = 'received';
        } elseif ($issued > 0 && $issued < $received) {
            $newStatus = 'pending';
        } elseif ($issued > 0 && $issued >= $received) {
            $newStatus = 'done';  // When issued >= received (balanced or shortage created)
        }

        $updateStmt = $conn->prepare("UPDATE header_infor SET status = ? WHERE work_order = ?");
        $updateStmt->bind_param("ss", $newStatus, $workOrder);
        $updateStmt->execute();
    }
}

$conn->close();
?>
