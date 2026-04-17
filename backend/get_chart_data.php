<?php
/**
 * Get Chart Data - Work Order Trends
 */
include "db.php";

$range = $_GET['range'] ?? '7days';
$now = new DateTime();
$startDate = clone $now;

if ($range === 'today') {
    $startDateStr = $now->format('Y-m-d');
} elseif ($range === 'all') {
    $minDateResult = $conn->query("SELECT MIN(work_date) AS min_date FROM header_infor WHERE work_date IS NOT NULL");
    $minDateRow = $minDateResult ? $minDateResult->fetch_assoc() : null;
    $startDateStr = !empty($minDateRow['min_date']) ? $minDateRow['min_date'] : $now->format('Y-m-d');
} elseif ($range === '30days') {
    $startDate->modify('-29 days');
    $startDateStr = $startDate->format('Y-m-d');
} else {
    $startDate->modify('-6 days');
    $startDateStr = $startDate->format('Y-m-d');
}

$sql = "
    SELECT work_date, status, COUNT(*) AS count
    FROM header_infor
    WHERE work_date >= ?
    GROUP BY work_date, status
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $startDateStr);
$stmt->execute();
$result = $stmt->get_result();

$counts = [];
while ($row = $result->fetch_assoc()) {
    $date = $row['work_date'];
    $status = strtolower(trim($row['status']));

    if (!isset($counts[$date])) {
        $counts[$date] = ['open' => 0, 'pending' => 0, 'done' => 0];
    }

    // Categorize statuses: open (created/received), pending, done
    if ($status === 'done') {
        $counts[$date]['done'] = (int)$row['count'];
    } elseif ($status === 'pending') {
        $counts[$date]['pending'] = (int)$row['count'];
    } else {
        // created, received, or any other status = open
        $counts[$date]['open'] += (int)$row['count'];
    }
}

$chartData = [];
if ($range === 'today') {
    $dateStr = $now->format('Y-m-d');
    $chartData[] = [
        'date' => $dateStr,
        'open' => $counts[$dateStr]['open'] ?? 0,
        'pending' => $counts[$dateStr]['pending'] ?? 0,
        'done' => $counts[$dateStr]['done'] ?? 0
    ];
} else {
    $currentDate = clone $startDate;
    $today = clone $now;
    $today->modify('+1 day');

    while ($currentDate->format('Y-m-d') !== $today->format('Y-m-d')) {
        $dateStr = $currentDate->format('Y-m-d');
        $chartData[] = [
            'date' => $dateStr,
            'open' => $counts[$dateStr]['open'] ?? 0,
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
