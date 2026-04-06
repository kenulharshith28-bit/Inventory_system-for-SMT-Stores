<?php
/**
 * User Registration API
 * 
 * Securely handles creating new user accounts using prepared statements.
 */
include "db.php";

$username = $_POST['username'] ?? null;
$password = $_POST['password'] ?? null;

if (!$username || !$password) {
    die("error: missing credentials");
}

// 1. Check if username already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo "exists";
} else {
    // 2. Insert new user
    // Note: Production apps should use password_hash()!
    $stmt_insert = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    $stmt_insert->bind_param("ss", $username, $password);
    
    if ($stmt_insert->execute()) {
        echo "success";
    } else {
        echo "error";
    }
    $stmt_insert->close();
}

$stmt->close();
$conn->close();
?>
