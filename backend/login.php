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
$stmt = $conn->prepare("SELECT id, username, password, role FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
 
if ($result->num_rows > 0) { 
     $user_data = $result->fetch_assoc();
     
     // Verify password using hash comparison
     if (password_verify($password, $user_data['password'])) {
         $_SESSION['user'] = $user_data['username']; 
         $_SESSION['role'] = $user_data['role']; // Store role in session
         echo "success"; 
     } else {
         // Password doesn't match - check for plain text fallback (for existing accounts)
         if ($password === $user_data['password']) {
             $_SESSION['user'] = $user_data['username']; 
             $_SESSION['role'] = $user_data['role'];
             // Upgrade to hashed password on next login attempt
             $updateStmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
             $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
             $updateStmt->bind_param("si", $hashedPassword, $user_data['id']);
             $updateStmt->execute();
             $updateStmt->close();
             echo "success";
         } else {
             echo "error"; 
         }
     }
} else { 
     echo "error"; 
} 

$stmt->close();
$conn->close();
?> 
