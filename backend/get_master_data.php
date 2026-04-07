<?php
include "db.php";

$type = strtolower(trim($_GET['type'] ?? ''));

if ($type === '') {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'type is required']);
    exit;
}

$allowedTypes = ['customer', 'item', 'size'];
if (!in_array($type, $allowedTypes, true)) {
    header('Content-Type: application/json');
    echo json_encode(['error' => "invalid type (received: $type)"]);
    exit;
}

$stmt = $conn->prepare("
    SELECT DISTINCT value
    FROM master_data
    WHERE type = ? AND value IS NOT NULL AND value <> ''
    ORDER BY value ASC
");
$stmt->bind_param("s", $type);
$stmt->execute();
$result = $stmt->get_result();

$values = [];
while ($row = $result->fetch_assoc()) {
    $values[] = $row['value'];
}

header('Content-Type: application/json');
echo json_encode($values);

$stmt->close();
$conn->close();
?>
