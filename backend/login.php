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
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND password = ?");
$stmt->bind_param("ss", $username, $password);
$stmt->execute();
$result = $stmt->get_result();
 
if ($result->num_rows > 0) { 
     $_SESSION['user'] = $username; 
     echo "success"; 
} else { 
     echo "error"; 
} 

$stmt->close();
$conn->close();
?>
