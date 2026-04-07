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
            COALESCE((SELECT SUM(received_qty) FROM receiving_log WHERE product_id = p.id), 0) as total_received
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

    // 2. Logic: Check for over receiving but ALLOW if confirmed (force=true)
    if ($totalReceived + $receivedQty > $mrQty && $force !== 'true') {
        echo json_encode([
            'success' => false, 
            'error' => 'OVER_LIMIT',
            'message' => "Warning: Adding $receivedQty will exceed MR Qty ($mrQty). Current total is $totalReceived.",
            'limit' => $mrQty,
            'current' => $totalReceived
        ]);
        exit;
    }

    // 3. Insert receiving record
    $insertStmt = $conn->prepare("
        INSERT INTO receiving_log (work_order, product_id, received_qty, received_date, received_notes)
        VALUES (?, ?, ?, ?, ?)
    ");
    $insertStmt->bind_param("siids", $workOrder, $productId, $receivedQty, $receivedDate, $receivedNotes);
    
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
            COALESCE((SELECT SUM(rl.received_qty) FROM receiving_log rl WHERE rl.work_order = p.work_order), 0) as total_received,
            COALESCE((SELECT SUM(il.issued_qty) FROM issuing_log il WHERE il.work_order = p.work_order), 0) as total_issued
        FROM product_information p
        WHERE p.work_order = ?
        GROUP BY p.work_order
    ");
    $stmt->bind_param("s", $workOrder);
    $stmt->execute();
    $totals = $stmt->get_result()->fetch_assoc();

    if ($totals) {
        $mr = intval($totals['total_mr_qty']);
        $received = intval($totals['total_received']);
        $issued = intval($totals['total_issued']);

        $newStatus = 'created';
        if ($issued >= $mr && $mr > 0) {
            $newStatus = 'done'; 
        } elseif ($issued > 0) {
            $newStatus = 'issuing';
        } elseif ($received > 0) {
            $newStatus = 'receiving';
        }

        $updateStmt = $conn->prepare("UPDATE header_infor SET status = ? WHERE work_order = ?");
        $updateStmt->bind_param("ss", $newStatus, $workOrder);
        $updateStmt->execute();
    }
}

$conn->close();
?>
