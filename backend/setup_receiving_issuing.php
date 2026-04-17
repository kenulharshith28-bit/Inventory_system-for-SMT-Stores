<?php
/**
 * Database Setup - Create Receiving and Issuing Tables
 * Run this once to set up the tables
 */
include "db.php";

try {
    // Add compatibility columns to product_information if they don't exist
    $requiredColumns = [
        'ignored' => "ALTER TABLE product_information ADD COLUMN ignored TINYINT(1) DEFAULT 0",
        'shortage_ignored' => "ALTER TABLE product_information ADD COLUMN shortage_ignored TINYINT(1) DEFAULT 0"
    ];

    foreach ($requiredColumns as $columnName => $alterSQL) {
        $checkColumnSQL = "SHOW COLUMNS FROM product_information LIKE '" . $columnName . "'";
        $result = $conn->query($checkColumnSQL);

        if ($result && $result->num_rows == 0) {
            if ($conn->query($alterSQL)) {
                echo "Added {$columnName} column to product_information<br>";
            } else {
                echo "Error adding {$columnName}: " . $conn->error . "<br>";
            }
        }
    }

    // Create receivings table
    $receivingSQL = "
    CREATE TABLE IF NOT EXISTS receivings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT,
        qty INT NOT NULL,
        date DATE NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES product_information(id) ON DELETE CASCADE,
        INDEX idx_product (product_id),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    if ($conn->query($receivingSQL)) {
        echo "receivings table created successfully<br>";
    } else {
        echo "Error creating receivings: " . $conn->error . "<br>";
    }

    // Create issues table
    $issuingSQL = "
    CREATE TABLE IF NOT EXISTS issues (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT,
        qty INT NOT NULL,
        date DATE NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES product_information(id) ON DELETE CASCADE,
        INDEX idx_product (product_id),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    if ($conn->query($issuingSQL)) {
        echo "issues table created successfully<br>";
    } else {
        echo "Error creating issues: " . $conn->error . "<br>";
    }

    echo "Database setup complete!";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}

$conn->close();
?>
