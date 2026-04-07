<?php
/**
 * User Registration API
 * 
 * Securely handles creating new user accounts.
 * Now restricted to Admins only.
 */
session_start();
include "db.php";

// 1. Check if the logged-in user is an Admin
if (!isset($_SESSION['user']) || ($_SESSION['role'] ?? '') !== 'admin') {
    die("error: unauthorized access");
}

$username = $_POST['username'] ?? null;
$password = $_POST['password'] ?? null;
$role = $_POST['role'] ?? 'user'; // Default role is user if not specified

if (!$username || !$password) {
    die("error: missing credentials");
}

// 2. Validate role
$allowed_roles = ['user', 'admin'];
if (!in_array($role, $allowed_roles)) {
    die("error: invalid role");
}

// 3. Check if username already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo "exists";
} else {
    // 4. Insert new user with role
    $stmt_insert = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
    $stmt_insert->bind_param("sss", $username, $password, $role);
    
    if ($stmt_insert->execute()) {
        echo "success";
    } else {
        echo "error: " . $stmt_insert->error;
    }
    $stmt_insert->close();
}

$stmt->close();
$conn->close();
?>
