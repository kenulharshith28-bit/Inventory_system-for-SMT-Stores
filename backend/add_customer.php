<?php
include "db.php";

$customer = trim($_POST['customer'] ?? '');

if ($customer === '') {
    die("error: customer name is required");
}

$checkStmt = $conn->prepare("SELECT id FROM master_data WHERE type = 'customer' AND value = ? LIMIT 1");
$checkStmt->bind_param("s", $customer);
$checkStmt->execute();
$result = $checkStmt->get_result();

if ($result->fetch_assoc()) {
    echo "exists";
    $checkStmt->close();
    $conn->close();
    exit;
}
$checkStmt->close();

$insertStmt = $conn->prepare("INSERT INTO master_data (type, value) VALUES ('customer', ?)");
$insertStmt->bind_param("s", $customer);

if ($insertStmt->execute()) {
    echo "added";
} else {
    echo "error: " . $insertStmt->error;
}

$insertStmt->close();
$conn->close();
?>
