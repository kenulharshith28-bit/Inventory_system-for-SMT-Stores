<?php
/**
 * Database Backup Scheduler
 * 
 * This file is designed to be triggered by Windows Task Scheduler (or cron on Linux)
 * to perform hourly database backups.
 * 
 * Windows Task Scheduler Setup:
 * 1. Open Task Scheduler
 * 2. Create Basic Task
 * 3. Name: "Stores Database Backup"
 * 4. Trigger: Daily, repeat every 1 hour
 * 5. Action: Start a program
 *    Program: C:\xampp\php\php.exe
 *    Arguments: C:\xampp\htdocs\Stores\backend\backup_scheduler.php
 * 6. Advanced: Enabled, repeat every 1 hour
 * 
 * Linux Cron Setup:
 * Add to crontab: 0 * * * * /usr/bin/php /var/www/html/Stores/backend/backup_scheduler.php
 */

require_once "backup_db.php";

// Perform the backup
$result = performDatabaseBackup();

// Log the result
$logfile = dirname(__FILE__) . DIRECTORY_SEPARATOR . "backup.log";
$timestamp = date("Y-m-d H:i:s");
$logMessage = "[{$timestamp}] " . ($result['success'] ? "SUCCESS" : "FAILED") 
    . " - " . $result['message'];

if (!$result['success']) {
    $logMessage .= " [Return Code Issue]";
}

// Append to log file
file_put_contents($logfile, $logMessage . PHP_EOL, FILE_APPEND);

// Exit with appropriate code
exit($result['success'] ? 0 : 1);

?>
