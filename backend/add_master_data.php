<?php
include "db.php";

$type = strtolower(trim($_POST['type'] ?? ''));
$value = trim($_POST['value'] ?? '');

if ($type === '' || $value === '') {
    die("error: type and value are required");
}

$allowedTypes = ['customer', 'item', 'size'];
if (!in_array($type, $allowedTypes, true)) {
    die("error: invalid type (received: $type)");
}

$checkStmt = $conn->prepare("SELECT id FROM master_data WHERE type = ? AND value = ? LIMIT 1");
$checkStmt->bind_param("ss", $type, $value);
$checkStmt->execute();
$result = $checkStmt->get_result();

if ($result->fetch_assoc()) {
    echo "exists";
    $checkStmt->close();
    $conn->close();
    exit;
}
$checkStmt->close();

$insertStmt = $conn->prepare("INSERT INTO master_data (type, value) VALUES (?, ?)");
$insertStmt->bind_param("ss", $type, $value);

if ($insertStmt->execute()) {
    echo "added";
} else {
    echo "error: " . $insertStmt->error;
}

$insertStmt->close();
$conn->close();
?>
