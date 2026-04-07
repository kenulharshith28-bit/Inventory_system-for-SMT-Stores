<?php
include "db.php";

// Get all master data with full details (id, type, value, created_at)
$stmt = $conn->prepare("
    SELECT id, type, value, created_at
    FROM master_data
    WHERE value IS NOT NULL AND value <> ''
    ORDER BY created_at DESC, type ASC, value ASC
");

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $conn->error]);
    exit;
}

$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = [
        'id' => $row['id'],
        'type' => ucfirst($row['type']),
        'value' => $row['value'],
        'created_at' => $row['created_at']
    ];
}

header('Content-Type: application/json');
echo json_encode(['success' => true, 'data' => $data]);

$stmt->close();
$conn->close();
?>
