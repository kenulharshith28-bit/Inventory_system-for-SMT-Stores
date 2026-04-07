<?php
/**
 * Database Setup - Create Receiving and Issuing Tables
 * Run this once to set up the tables
 */
include "db.php";

try {
    // Add shortage_ignored column to product_information if it doesn't exist
    $checkColumnSQL = "SHOW COLUMNS FROM product_information LIKE 'shortage_ignored'";
    $result = $conn->query($checkColumnSQL);
    
    if ($result->num_rows == 0) {
        $alterSQL = "ALTER TABLE product_information ADD COLUMN shortage_ignored TINYINT DEFAULT 0";
        if ($conn->query($alterSQL)) {
            echo "Added shortage_ignored column to product_information<br>";
        } else {
            echo "Error adding column: " . $conn->error . "<br>";
        }
    }

    // Create receiving_log table
    $receivingSQL = "
    CREATE TABLE IF NOT EXISTS receiving_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        work_order VARCHAR(255) NOT NULL,
        product_id INT,
        received_qty INT NOT NULL,
        received_date DATE NOT NULL,
        received_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES product_information(id) ON DELETE CASCADE,
        INDEX idx_work_order (work_order),
        INDEX idx_received_date (received_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    if ($conn->query($receivingSQL)) {
        echo "receiving_log table created successfully<br>";
    } else {
        echo "Error creating receiving_log: " . $conn->error . "<br>";
    }

    // Create issuing_log table
    $issuingSQL = "
    CREATE TABLE IF NOT EXISTS issuing_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        work_order VARCHAR(255) NOT NULL,
        product_id INT,
        issued_qty INT NOT NULL,
        issued_date DATE NOT NULL,
        issued_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES product_information(id) ON DELETE CASCADE,
        INDEX idx_work_order (work_order),
        INDEX idx_issued_date (issued_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    if ($conn->query($issuingSQL)) {
        echo "issuing_log table created successfully<br>";
    } else {
        echo "Error creating issuing_log: " . $conn->error . "<br>";
    }

    echo "Database setup complete!";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}

$conn->close();
?>
