<?php
session_start();
include "db.php";

// SELF-HEALING: Ensure ID column exists and is auto_increment
$id_col = $conn->query("SHOW COLUMNS FROM users LIKE 'id'")->fetch_assoc();
if (!$id_col) {
    $conn->query("ALTER TABLE users ADD COLUMN id INT(11) AUTO_INCREMENT PRIMARY KEY FIRST");
} else if ($id_col['Extra'] !== 'auto_increment') {
    // If it exists but isn't auto_increment, try to fix it (if not already a PK elsewhere)
    $conn->query("ALTER TABLE users MODIFY COLUMN id INT(11) AUTO_INCREMENT");
}

// Fix any ID 0 users
$conn->query("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO'");
$conn->query("UPDATE users SET id = NULL WHERE id = 0");

// Admin check
if (!isset($_SESSION['user']) || ($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT id, username, role, created_at FROM users ORDER BY id DESC");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    $totalCount = 0;
    $adminCount = 0;
    
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
        $totalCount++;
        if ($row['role'] === 'admin') {
            $adminCount++;
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => $users,
        'stats' => [
            'total' => $totalCount,
            'admins' => $adminCount
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

$conn->close();
?>
