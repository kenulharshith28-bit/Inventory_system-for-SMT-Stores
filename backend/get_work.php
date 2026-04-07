<?php
/**
 * Get Work Orders - Filtered by range
 */
include "db.php";

// Handle getAllColours action for autocomplete
if (isset($_GET['action']) && $_GET['action'] === 'getAllColours') {
    $colourSql = "SELECT DISTINCT colour FROM product_information WHERE colour IS NOT NULL AND colour != '' ORDER BY colour ASC LIMIT 100";
    $colourResult = $conn->query($colourSql);
    $colours = [];
    while ($row = $colourResult->fetch_assoc()) {
        $colours[] = $row['colour'];
    }
    
    $codeSql = "SELECT DISTINCT item_code FROM product_information WHERE item_code IS NOT NULL AND item_code != '' ORDER BY item_code ASC LIMIT 100";
    $codeResult = $conn->query($codeSql);
    $codes = [];
    while ($row = $codeResult->fetch_assoc()) {
        $codes[] = $row['item_code'];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $colours,
        'itemCodes' => $codes
    ]);
    exit;
}

$range = $_GET['range'] ?? '7days';
$now = new DateTime();
$startDate = clone $now;

if ($range === 'today') {
    $startDateStr = $now->format('Y-m-d');
} elseif ($range === '30days') {
    $startDate->modify('-29 days');
    $startDateStr = $startDate->format('Y-m-d');
} else {
    $startDate->modify('-6 days');
    $startDateStr = $startDate->format('Y-m-d');
}

$sql = "
    SELECT
        h.id,
        h.customer_name,
        h.work_order,
        h.mrn_no,
        h.cut_qty,
        h.location,
        h.work_date,
        h.status,
        p.id AS product_id,
        p.item_code,
        p.item,
        p.colour,
        p.size,
        p.unit,
        p.mr_qty,
        p.ignored
    FROM header_infor h
    LEFT JOIN product_information p ON p.work_order = h.work_order
    WHERE h.work_date >= ?
    ORDER BY h.id DESC
";

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
