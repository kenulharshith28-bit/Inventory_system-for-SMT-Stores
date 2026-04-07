<?php
include "db.php";

$stmt = $conn->prepare("
    SELECT DISTINCT value
    FROM master_data
    WHERE type = 'customer' AND value IS NOT NULL AND value <> ''
    ORDER BY value ASC
");
$stmt->execute();
$result = $stmt->get_result();

$customers = [];
while ($row = $result->fetch_assoc()) {
    $customers[] = $row['value'];
}

header('Content-Type: application/json');
echo json_encode($customers);

$stmt->close();
$conn->close();
?>
