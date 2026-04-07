<?php
include "db.php";

$username = trim($_POST['username'] ?? '');
$password = trim($_POST['password'] ?? '');
$role = trim($_POST['role'] ?? 'user');

if ($username === '' || $password === '') {
    die("error: username and password are required");
}

if (strlen($password) < 4) {
    die("error: password must be at least 4 characters");
}

// Check if username exists
$checkStmt = $conn->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
if (!$checkStmt) {
    die("error: " . $conn->error);
}

$checkStmt->bind_param("s", $username);
$checkStmt->execute();
$result = $checkStmt->get_result();

if ($result->fetch_assoc()) {
    echo "exists";
    $checkStmt->close();
    $conn->close();
    exit;
}
$checkStmt->close();

// Hash the password
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Insert new user
$insertStmt = $conn->prepare("INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, NOW())");
if (!$insertStmt) {
    die("error: " . $conn->error);
}

$insertStmt->bind_param("sss", $username, $hashedPassword, $role);

if ($insertStmt->execute()) {
    echo "created";
} else {
    echo "error: " . $insertStmt->error;
}

$insertStmt->close();
$conn->close();
?>
