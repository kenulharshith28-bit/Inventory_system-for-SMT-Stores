<?php
/**
 * Get Work Orders with Shortage Status
 */
header('Content-Type: application/json');
include "db.php";

try {
    $query = "
        SELECT 
            h.id,
            h.customer_name,
            h.work_order,
            h.mrn_no,
            h.cut_qty,
            h.location,
            h.work_date,
            h.status,
            p.id as product_id,
            p.item_code,
            p.item,
            p.colour,
            p.size,
            p.unit,
            p.mr_qty,
            COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN r.received_qty ELSE 0 END), 0) as total_received,
            COALESCE(SUM(CASE WHEN i.id IS NOT NULL THEN i.issued_qty ELSE 0 END), 0) as total_issued
        FROM header_infor h
        LEFT JOIN product_information p ON p.work_order = h.work_order
        LEFT JOIN receiving_log r ON r.product_id = p.id
        LEFT JOIN issuing_log i ON i.product_id = p.id
        GROUP BY h.id, p.id
        ORDER BY h.id DESC
    ";

    $result = $conn->query($query);
    $workOrders = [];

    while ($row = $result->fetch_assoc()) {
        $row['total_received'] = intval($row['total_received']);
        $row['total_issued'] = intval($row['total_issued']);
        $row['mr_qty'] = intval($row['mr_qty']);
        
        // Calculate shortage
        if ($row['mr_qty'] > 0) {
            $totalInventory = $row['total_received'] + $row['total_issued'];
            $row['hasShortage'] = $totalInventory < $row['mr_qty'];
            $row['shortage'] = max(0, $row['mr_qty'] - $totalInventory);
        } else {
            $row['hasShortage'] = false;
            $row['shortage'] = 0;
        }

        $workOrders[] = $row;
    }

    echo json_encode([
        'success' => true,
        'data' => $workOrders
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

$conn->close();
?>
