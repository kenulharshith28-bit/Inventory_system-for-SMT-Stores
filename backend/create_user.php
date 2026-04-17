<?php
/**
 * Create User API - Admin Only
 * 
 * SECURITY: Only authenticated admin users can create new user accounts.
 * This endpoint:
 * - Validates admin session
 * - Prevents duplicate usernames
 * - Hashes passwords securely
 * - Returns clear status responses
 * 
 * Called from: Dashboard > Users tab > Create User form
 * Method: POST
 * Parameters:
 *   - username (string, required, unique)
 *   - password (string, required, min 4 chars)
 *   - role (string, optional, default='user', values: 'user'|'admin'|'supervisor')
 * 
 * Responses:
 *   - "created" → User successfully created
 *   - "exists" → Username already exists
 *   - "error: {message}" → Validation or DB error
 */

session_start();
include "db.php";

// =====================================================
// STEP 1: Verify User is Logged In & is Admin
// =====================================================
if (!isset($_SESSION['user'])) {
    die("error: not logged in");
}

if (($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(403);
    die("error: unauthorized - only admins can create users");
}

// =====================================================
// STEP 2: Get and Validate Input
// =====================================================
$username = trim($_POST['username'] ?? '');
$password = trim($_POST['password'] ?? '');
$role = trim($_POST['role'] ?? 'user');

// Validate username
if ($username === '') {
    die("error: username is required");
}

if (strlen($username) < 3) {
    die("error: username must be at least 3 characters");
}

if (strlen($username) > 50) {
    die("error: username must not exceed 50 characters");
}

// Validate only alphanumeric and underscore
if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    die("error: username can only contain letters, numbers, and underscores");
}

// Validate password
if ($password === '') {
    die("error: password is required");
}

if (strlen($password) < 4) {
    die("error: password must be at least 4 characters");
}

if (strlen($password) > 128) {
    die("error: password must not exceed 128 characters");
}

// Validate role
$allowed_roles = ['user', 'admin', 'supervisor'];
if (!in_array($role, $allowed_roles)) {
    die("error: invalid role - must be one of: user, admin, supervisor");
}

// =====================================================
// STEP 3: Check Username Uniqueness
// =====================================================
$checkStmt = $conn->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
if (!$checkStmt) {
    http_response_code(500);
    die("error: database error - " . $conn->error);
}

$checkStmt->bind_param("s", $username);
if (!$checkStmt->execute()) {
    http_response_code(500);
    die("error: database error during username check");
}

$result = $checkStmt->get_result();
if ($result->num_rows > 0) {
    $checkStmt->close();
    echo "exists";
    exit;
}
$checkStmt->close();

// =====================================================
// STEP 4: Hash Password Securely
// =====================================================
// Using PASSWORD_DEFAULT (currently bcrypt with cost of 10)
// This is secure and future-proof as PHP will update it automatically
$hashedPassword = password_hash($password, PASSWORD_DEFAULT, ['cost' => 10]);

if ($hashedPassword === false) {
    http_response_code(500);
    die("error: failed to hash password");
}

// =====================================================
// STEP 5: Insert New User into Database
// =====================================================
$insertStmt = $conn->prepare(
    "INSERT INTO users (username, password, role, created_at) 
     VALUES (?, ?, ?, NOW())"
);

if (!$insertStmt) {
    http_response_code(500);
    die("error: database error - " . $conn->error);
}

$insertStmt->bind_param("sss", $username, $hashedPassword, $role);

if ($insertStmt->execute()) {
    // User created successfully
    http_response_code(201); // 201 Created
    echo "created";
} else {
    http_response_code(500);
    // Check if it's a duplicate key error (shouldn't happen due to check above)
    if (strpos($insertStmt->error, 'Duplicate') !== false) {
        echo "exists";
    } else {
        die("error: database error - " . $insertStmt->error);
    }
}

$insertStmt->close();
$conn->close();
?>
