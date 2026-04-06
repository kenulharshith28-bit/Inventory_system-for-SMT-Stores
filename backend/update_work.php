<?php 
 include "db.php"; 
 
 $id = $_POST['id'] ?? null; 
 $name = $_POST['customer_name'] ?? ''; 
 $phone = $_POST['phone'] ?? ''; 
 $item = $_POST['item_type'] ?? ''; 
 $status = $_POST['status'] ?? 'Pending'; 
 $deadline = $_POST['deadline'] ?? '';
 $notes = $_POST['notes'] ?? '';
 $measurements = $_POST['measurements'] ?? '';
 
 if (!$id) {
     die("error: ID missing");
 }
 
 $stmt = $conn->prepare("UPDATE work_orders SET customer_name=?, phone=?, item_type=?, status=?, deadline=?, notes=?, measurements=? WHERE id=?");
 $stmt->bind_param("sssssssi", $name, $phone, $item, $status, $deadline, $notes, $measurements, $id);
 
 if ($stmt->execute()) { 
     echo "updated"; 
 } else { 
     echo "error: " . $stmt->error; 
 } 
 $stmt->close();
 ?> 
