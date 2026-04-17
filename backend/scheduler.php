#!/usr/bin/env php
<?php
/**
 * Backup Scheduler Wrapper
 * 
 * This script can be called from cron (Linux/Mac) or Task Scheduler (Windows)
 * to run backups automatically.
 * 
 * It validates the environment before running and handles edge cases.
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Increase memory and timeout for large databases
ini_set('memory_limit', '512M');
set_time_limit(600); // 10 minutes

// Get the absolute path to backup automation script
$backupScriptPath = __DIR__ . DIRECTORY_SEPARATOR . 'backup_automation.php';

if (!file_exists($backupScriptPath)) {
    error_log("ERROR: Backup automation script not found at: {$backupScriptPath}");
    exit(1);
}

// Include and run the backup automation
try {
    $result = include $backupScriptPath;
    exit(is_array($result) && isset($result['success']) ? ($result['success'] ? 0 : 1) : 1);
} catch (Exception $e) {
    error_log("ERROR: Exception in backup scheduler: " . $e->getMessage());
    exit(1);
}
?>
