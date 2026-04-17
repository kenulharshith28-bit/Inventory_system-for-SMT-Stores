<?php
/**
 * User Registration API - DISABLED
 * 
 * This endpoint is disabled. User registration is only available through
 * the Admin Panel (Dashboard > Users > Create User).
 * 
 * Only admins can create new user accounts via create_user.php
 */
session_start();
include "db.php";

// REGISTRATION IS DISABLED - Only admins can create users through Dashboard
die("error: registration disabled - use admin panel to create users");

$username = $_POST['username'] ?? null;
$password = $_POST['password'] ?? null;
$role = $_POST['role'] ?? 'user'; // Default role is user if not specified

if (!$username || !$password) {
    die("error: missing credentials");
}

// Validate password strength
if (strlen($password) < 6) {
    die("error: password must be at least 6 characters");
}

// Hash the password for security
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

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
    // 4. Insert new user with role and hashed password
    $stmt_insert = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
    $stmt_insert->bind_param("sss", $username, $hashedPassword, $role);
    
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
