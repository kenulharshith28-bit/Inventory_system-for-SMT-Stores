<?php
/**
 * Database Connection Configuration
 * 
 * This file establishes a connection to the MySQL database using the MySQLi extension.
 * It is included in all backend scripts that require database access.
 */

// Database configuration parameters
$host     = "localhost";      // Server hostname (usually localhost)
$username = "root";           // MySQL username
$password = "";               // MySQL password (default is empty for XAMPP)
$dbname   = "stores"; // Name of the database to connect to

// Create a new connection instance
$conn = new mysqli($host, $username, $password, $dbname);

// Check if the connection was successful
if ($conn->connect_error) {
    // If connection fails, stop execution and show error
    die("Database Connection failed: " . $conn->connect_error);
}

// Connection successful - $conn object is now ready for use in other scripts
?>
