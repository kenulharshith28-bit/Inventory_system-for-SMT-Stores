<?php 
/**
 * User Login API
 * 
 * Securely handles user authentication using prepared statements.
 */
session_start();
include "db.php"; 
 
$username = $_POST['username'] ?? null; 
$password = $_POST['password'] ?? null; 
 
if (!$username || !$password) {
    die("error: missing credentials");
}

// Using prepared statements for security
// Fetch both user information and role
$stmt = $conn->prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?");
$stmt->bind_param("ss", $username, $password);
$stmt->execute();
$result = $stmt->get_result();
 
if ($result->num_rows > 0) { 
     $user_data = $result->fetch_assoc();
     $_SESSION['user'] = $user_data['username']; 
     $_SESSION['role'] = $user_data['role']; // Store role in session
     echo "success"; 
} else { 
     echo "error"; 
} 

$stmt->close();
$conn->close();
?> 
