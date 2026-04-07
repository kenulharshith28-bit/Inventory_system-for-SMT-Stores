<?php
session_start();

// Include backup function
require_once "backup_db.php";

// Perform database backup before destroying session
performDatabaseBackup();

// Destroy session
session_destroy();

echo "logged_out";

?>
 
