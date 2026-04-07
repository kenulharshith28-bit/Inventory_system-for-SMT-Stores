<?php
session_start();
include "db.php";

// Admin check
if (!isset($_SESSION['user']) || ($_SESSION['role'] ?? '') !== 'admin') {
    die("error: unauthorized access");
}

$type = strtolower(trim($_POST['type'] ?? ''));
$value = trim($_POST['value'] ?? '');

if ($type === '' || $value === '') {
    die("error: type and value are required");
}

$allowedTypes = ['customer', 'item', 'size'];
if (!in_array($type, $allowedTypes, true)) {
    die("error: invalid type (received: $type)");
}

$stmt = $conn->prepare("DELETE FROM master_data WHERE type = ? AND value = ?");
$stmt->bind_param("ss", $type, $value);

if ($stmt->execute()) {
    echo "deleted";
} else {
    echo "error: " . $stmt->error;
}

$stmt->close();
$conn->close();
?>
