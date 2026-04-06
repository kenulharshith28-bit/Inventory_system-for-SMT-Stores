<?php 
/**
 * Delete Work Order
 * 
 * Securely deletes a work order from the database using a prepared statement.
 * Expects 'id' as a query parameter (GET).
 */
 include "db.php"; 
 
 // Get ID from GET parameter (used by fetch in script.js)
 $id = $_GET['id'] ?? null; 
 
 if (!$id) {
     die("error: ID missing");
 }
 
 // Using a prepared statement for security
 $stmt = $conn->prepare("DELETE FROM work_orders WHERE id = ?");
 $stmt->bind_param("i", $id);
 
 if ($stmt->execute()) { 
     echo "deleted"; 
 } else { 
     echo "error: " . $stmt->error; 
 } 
 
 $stmt->close();
 ?> 
