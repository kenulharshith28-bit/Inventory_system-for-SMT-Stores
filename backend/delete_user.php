<?php
session_start();
include "db.php";

// Admin check
if (!isset($_SESSION['user']) || ($_SESSION['role'] ?? '') !== 'admin') {
    die("error: unauthorized access");
}

$id = intval($_POST['id'] ?? 0);
$usernameToDelete = $_POST['username'] ?? '';

if ($id <= 0) {
    die("error: invalid id (received: " . ($_POST['id'] ?? 'nothing') . ")");
}

// Prevent self-deletion
if ($usernameToDelete === $_SESSION['user']) {
    die("error: you cannot delete your own account");
}

$stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo "deleted";
} else {
    echo "error: " . $stmt->error;
}

$stmt->close();
$conn->close();
?>
