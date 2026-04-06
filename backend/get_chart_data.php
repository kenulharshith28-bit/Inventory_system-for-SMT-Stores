<?php
/**
 * Get Chart Data - Work Order Trends
 * 
 * Securely filters and groups work orders by date and status.
 * Ensures all dates in the range are included with 0s.
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

// 1. Fetch grouped counts from DB
$sql = "SELECT order_date, status, COUNT(*) as count 
        FROM work_orders 
        WHERE order_date >= ? 
        GROUP BY order_date, status";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $startDateStr);
$stmt->execute();
$result = $stmt->get_result();

$counts = [];
while ($row = $result->fetch_assoc()) {
    $date = $row['order_date'];
    $status = strtolower($row['status']);
    if (!isset($counts[$date])) {
        $counts[$date] = ['pending' => 0, 'done' => 0];
    }
    $counts[$date][$status] = (int)$row['count'];
}

// 2. Generate full range of dates in PHP to ensure zero-counts are included
$chartData = [];
if ($range === 'today') {
    $dateStr = $now->format('Y-m-d');
    $chartData[] = [
        'date' => $dateStr,
        'pending' => $counts[$dateStr]['pending'] ?? 0,
        'done' => $counts[$dateStr]['done'] ?? 0
    ];
} else {
    $currentDate = clone $startDate;
    $today = clone $now;
    $today->modify('+1 day'); // Ensure today is inclusive in loop

    while ($currentDate->format('Y-m-d') !== $today->format('Y-m-d')) {
        $dateStr = $currentDate->format('Y-m-d');
        $chartData[] = [
            'date' => $dateStr,
            'pending' => $counts[$dateStr]['pending'] ?? 0,
            'done' => $counts[$dateStr]['done'] ?? 0
        ];
        $currentDate->modify('+1 day');
    }
}

echo json_encode($chartData);
$stmt->close();
$conn->close();
?>
