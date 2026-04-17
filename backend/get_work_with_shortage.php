<?php
/**
 * Get Work Orders with Shortage Status
 */
header('Content-Type: application/json');
include "db.php";

try {
    $query = "
        SELECT
            x.id,
            x.customer_name,
            x.work_order,
            x.mrn_no,
            x.cut_qty,
            x.location,
            x.work_date,
            x.status,
            x.product_count,
            x.item_summary,
            x.total_mr_qty,
            x.total_received,
            x.total_issued,
            x.receiving_over_mr,
            x.receiving_shortage,
            x.issuing_shortage,
            x.issuing_over_mr,
            x.has_active_shortage,
            x.shortage_ignored
        FROM (
            SELECT
                MIN(h.id) AS id,
                h.customer_name,
                h.work_order,
                h.mrn_no,
                h.cut_qty,
                h.location,
                h.work_date,
                h.status,
                COUNT(*) AS product_count,
                GROUP_CONCAT(
                    DISTINCT CONCAT_WS(' / ', p.item, p.colour, p.size)
                    ORDER BY p.id
                    SEPARATOR ', '
                ) AS item_summary,
                SUM(COALESCE(p.mr_qty, 0)) AS total_mr_qty,
                SUM(COALESCE(r.total_received, 0)) AS total_received,
                SUM(COALESCE(i.total_issued, 0)) AS total_issued,
                SUM(GREATEST(COALESCE(r.total_received, 0) - COALESCE(p.mr_qty, 0), 0)) AS receiving_over_mr,
                SUM(GREATEST(COALESCE(p.mr_qty, 0) - COALESCE(r.total_received, 0), 0)) AS receiving_shortage,
                SUM(GREATEST(COALESCE(p.mr_qty, 0) - COALESCE(i.total_issued, 0), 0)) AS issuing_shortage,
                SUM(GREATEST(COALESCE(i.total_issued, 0) - COALESCE(p.mr_qty, 0), 0)) AS issuing_over_mr,
                SUM(
                    CASE
                        WHEN COALESCE(p.shortage_ignored, 0) = 0
                         AND COALESCE(p.mr_qty, 0) > 0
                         AND NOT (
                             COALESCE(r.total_received, 0) = COALESCE(p.mr_qty, 0)
                             AND COALESCE(i.total_issued, 0) = COALESCE(p.mr_qty, 0)
                         )
                        THEN 1
                        ELSE 0
                    END
                ) AS has_active_shortage,
                MAX(COALESCE(p.shortage_ignored, 0)) AS shortage_ignored
            FROM header_infor h
            INNER JOIN product_information p ON p.work_order = h.work_order
            LEFT JOIN (
                SELECT product_id, SUM(qty) AS total_received
                FROM receivings
                GROUP BY product_id
            ) r ON r.product_id = p.id
            LEFT JOIN (
                SELECT product_id, SUM(qty) AS total_issued
                FROM issues
                GROUP BY product_id
            ) i ON i.product_id = p.id
            GROUP BY
                h.customer_name,
                h.work_order,
                h.mrn_no,
                h.cut_qty,
                h.location,
                h.work_date,
                h.status
            HAVING has_active_shortage > 0
            ORDER BY MIN(h.id) DESC
        ) x
    ";

    $result = $conn->query($query);
    if (!$result) {
        throw new Exception($conn->error);
    }

    $workOrders = [];
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int) $row['id'];
        $row['product_count'] = (int) $row['product_count'];
        $row['total_mr_qty'] = (int) $row['total_mr_qty'];
        $row['total_received'] = (int) $row['total_received'];
        $row['total_issued'] = (int) $row['total_issued'];
        $row['receiving_over_mr'] = (int) $row['receiving_over_mr'];
        $row['receiving_shortage'] = (int) $row['receiving_shortage'];
        $row['issuing_shortage'] = (int) $row['issuing_shortage'];
        $row['issuing_over_mr'] = (int) $row['issuing_over_mr'];
        $row['has_active_shortage'] = (int) $row['has_active_shortage'];
        $row['shortage_ignored'] = (int) $row['shortage_ignored'];
        $row['isComplete'] = false;
        $row['hasShortage'] = $row['has_active_shortage'] > 0;
        $row['shortage'] = max($row['receiving_shortage'], $row['issuing_shortage']);
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
