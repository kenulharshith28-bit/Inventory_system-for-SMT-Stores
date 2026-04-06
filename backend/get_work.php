<?php
/**
 * Get Work Orders - Filtered by range
 */
include "db.php"; 
 
$range = $_GET['range'] ?? '7days';
$now = new DateTime();
$startDate = clone $now;

if ($range === 'today') {
    $startDateStr = $now->format('Y-m-d');
} elseif ($range === '30days') {
    $startDate->modify('-29 days'); // Inclusive of today = 30 days total
    $startDateStr = $startDate->format('Y-m-d');
} else {
    $startDate->modify('-6 days'); // Inclusive of today = 7 days total
    $startDateStr = $startDate->format('Y-m-d');
}

// Get work orders within range
$sql = "SELECT * FROM work_orders WHERE order_date >= ? ORDER BY id DESC"; 
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $startDateStr);
$stmt->execute();
$result = $stmt->get_result(); 

$data = []; 
while ($row = $result->fetch_assoc()) { 
    $data[] = $row; 
} 

echo json_encode($data); 
$stmt->close();
$conn->close();
?>
