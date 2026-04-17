<?php
/**
 * Ignore shortage for an entire work order
 */
header('Content-Type: application/json');
include "db.php";

$workOrder = trim($_POST['work_order'] ?? '');

if ($workOrder === '') {
    echo json_encode(['success' => false, 'error' => 'Work order required']);
    exit;
}

try {
    $stmt = $conn->prepare("
        UPDATE product_information
        SET shortage_ignored = 1,
            ignored = 1
        WHERE work_order = ?
    ");
    $stmt->bind_param("s", $workOrder);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Work order shortage ignored successfully'
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to ignore work order shortage']);
    }

    $stmt->close();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

$conn->close();
?>
