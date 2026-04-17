<?php
/**
 * Get Work Orders - Filtered by range or specific Work Order
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

$workOrderFilter = $_GET['work_order'] ?? null;
$range = $_GET['range'] ?? '7days';

if ($workOrderFilter) {
    // Detailed view for reports / search: return one row per product.
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
            p.ignored,
            COALESCE(r.total_received, 0) as total_received,
            COALESCE(i.total_issued, 0) as total_issued
        FROM header_infor h
        LEFT JOIN product_information p ON p.work_order = h.work_order
        LEFT JOIN (
            SELECT product_id, SUM(qty) as total_received
            FROM receivings 
            GROUP BY product_id
        ) r ON r.product_id = p.id
        LEFT JOIN (
            SELECT product_id, SUM(qty) as total_issued 
            FROM issues 
            GROUP BY product_id
        ) i ON i.product_id = p.id
        WHERE h.work_order = ?
        ORDER BY p.id ASC
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $workOrderFilter);
} else {
    // Summary view for the home dashboard: one row per work order.
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
            fp.id AS product_id,
            fp.item_code,
            fp.item,
            fp.colour,
            fp.size,
            fp.unit,
            fp.mr_qty,
            COALESCE(ps.product_count, 0) AS product_count,
            COALESCE(ps.item_summary, '') AS item_summary,
            COALESCE(rt.total_received, 0) as total_received,
            COALESCE(it.total_issued, 0) as total_issued
        FROM header_infor h
        LEFT JOIN (
            SELECT p1.*
            FROM product_information p1
            INNER JOIN (
                SELECT work_order, MIN(id) AS first_product_id
                FROM product_information
                GROUP BY work_order
            ) first_prod ON first_prod.work_order = p1.work_order AND first_prod.first_product_id = p1.id
        ) fp ON fp.work_order = h.work_order
        LEFT JOIN (
            SELECT work_order, COUNT(*) AS product_count, GROUP_CONCAT(item ORDER BY id SEPARATOR ', ') AS item_summary
            FROM product_information
            GROUP BY work_order
        ) ps ON ps.work_order = h.work_order
        LEFT JOIN (
            SELECT p.work_order, SUM(r.qty) AS total_received
            FROM receivings r
            INNER JOIN product_information p ON p.id = r.product_id
            GROUP BY p.work_order
        ) rt ON rt.work_order = h.work_order
        LEFT JOIN (
            SELECT p.work_order, SUM(i.qty) AS total_issued
            FROM issues i
            INNER JOIN product_information p ON p.id = i.product_id
            GROUP BY p.work_order
        ) it ON it.work_order = h.work_order
    ";

    $now = new DateTime();
    $startDate = clone $now;

    if ($range === 'today') {
        $startDateStr = $now->format('Y-m-d');
    } elseif ($range === 'all') {
        $startDateStr = '0001-01-01';
    } elseif ($range === '30days') {
        $startDate->modify('-29 days');
        $startDateStr = $startDate->format('Y-m-d');
    } else {
        $startDate->modify('-6 days');
        $startDateStr = $startDate->format('Y-m-d');
    }

    $sql .= " WHERE h.work_date >= ? ORDER BY h.id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $startDateStr);
}

$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

header('Content-Type: application/json');
echo json_encode($data);

$stmt->close();
$conn->close();
?>
