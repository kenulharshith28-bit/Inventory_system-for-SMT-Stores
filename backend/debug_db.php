<?php
require_once 'db.php';

$result = $conn->query("SHOW TABLES");
if ($result) {
    echo "Tables in database '{$dbname}':\n";
    while ($row = $result->fetch_array()) {
        $tableName = $row[0];
        echo "Table: $tableName\n";
        
        $createTable = $conn->query("SHOW CREATE TABLE `$tableName` ");
        if ($createTable) {
            $createRow = $createTable->fetch_row();
            echo $createRow[1] . "\n\n";
        }
    }
} else {
    echo "Error showing tables: " . $conn->error;
}
?>
