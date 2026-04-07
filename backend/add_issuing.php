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

if (!$workOrder || !$productId || $issuedQty <= 0) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields or invalid quantity']);
    exit;
}

try {
    // 1. Get current totals (Received and Issued)
    $stmt = $conn->prepare("
        SELECT 
            p.mr_qty,
            COALESCE((SELECT SUM(received_qty) FROM receiving_log WHERE product_id = p.id), 0) as total_received,
            COALESCE((SELECT SUM(issued_qty) FROM issuing_log WHERE product_id = p.id), 0) as total_issued
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

    // 2. Check if issuing would exceed available stock (but allow it with warning)
    $hasWarning = false;
    $warningMessage = '';
    if ($totalIssued + $issuedQty > $totalReceived) {
        $hasWarning = true;
        $warningMessage = "Warning: Issuing ($issuedQty) exceeds available stock (" . ($totalReceived - $totalIssued) . "). This will create a shortage.";
    }

    // 3. Insert issuing record
    $insertStmt = $conn->prepare("
        INSERT INTO issuing_log (work_order, product_id, issued_qty, issued_date, issued_notes)
        VALUES (?, ?, ?, ?, ?)
    ");
    $insertStmt->bind_param("siids", $workOrder, $productId, $issuedQty, $issuedDate, $issuedNotes);
    
    if ($insertStmt->execute()) {
        // 4. Status Automation Logic
        updateWorkOrderStatus($conn, $workOrder);

        $response = [
            'success' => true,
            'message' => 'Issuing record added successfully',
            'new_total_issued' => $totalIssued + $issuedQty
        ];
        
        if ($hasWarning) {
            $response['warning'] = true;
            $response['warning_message'] = $warningMessage;
        }
        
        echo json_encode($response);
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
