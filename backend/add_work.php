<?php 
 include "db.php"; 
 
 $name = $_POST['customer_name'] ?? ''; 
 $phone = $_POST['phone'] ?? ''; 
 $item = $_POST['item_type'] ?? ''; 
 $deadline = $_POST['deadline'] ?? ''; 
 $notes = $_POST['notes'] ?? ''; 
 $measurements = $_POST['measurements'] ?? '';
 
 $status = "Pending"; 
 $date = date("Y-m-d"); 
 
 // Using prepared statements for security
 $stmt = $conn->prepare("INSERT INTO work_orders (customer_name, phone, item_type, status, order_date, deadline, notes, measurements) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
 $stmt->bind_param("ssssssss", $name, $phone, $item, $status, $date, $deadline, $notes, $measurements);
 
 if ($stmt->execute()) { 
     echo "added"; 
 } else { 
     echo "error: " . $stmt->error; 
 } 
 $stmt->close();
 ?> 
