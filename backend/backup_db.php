<?php
/**
 * Database Backup Module
 * 
 * Provides functionality to create and manage full database backups.
 * Backups are stored as .sql files in the /backups/ directory.
 * Only the most recent backup is retained; older backups are automatically deleted.
 */

/**
 * Performs a full database backup using mysqldump command
 * 
 * Process:
 * 1. Creates /backups/ directory if it doesn't exist
 * 2. Exports full "stores" database as .sql file with timestamp
 * 3. Deletes previous backup file (keeps only 1 backup)
 * 4. Returns status array
 * 
 * @return array ['success' => bool, 'message' => string, 'filename' => string|null]
 */
function performDatabaseBackup() {
    // Database credentials from db.php context
    $host = "localhost";
    $username = "root";
    $password = "";
    $dbname = "stores";
    
    // Get workspace root - assumes this file is in /backend/ subdirectory
    $backupDir = dirname(dirname(__FILE__)) . DIRECTORY_SEPARATOR . "backups";
    
    // Create backups directory if it doesn't exist
    if (!is_dir($backupDir)) {
        if (!mkdir($backupDir, 0755, true)) {
            return [
                'success' => false,
                'message' => 'Failed to create backups directory',
                'filename' => null
            ];
        }
    }
    
    // Ensure directory is writable
    if (!is_writable($backupDir)) {
        return [
            'success' => false,
            'message' => 'Backups directory is not writable',
            'filename' => null
        ];
    }
    
    // Generate backup filename with timestamp
    $timestamp = date("Y-m-d_His"); // Format: 2026-04-06_143052
    $backupFilename = "stores_backup_" . $timestamp . ".sql";
    $backupFilepath = $backupDir . DIRECTORY_SEPARATOR . $backupFilename;
    
    // Find and delete previous backup file
    $files = glob($backupDir . DIRECTORY_SEPARATOR . "stores_backup_*.sql");
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
    
    // Determine mysqldump path based on OS
    $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    
    // Try to find mysqldump executable
    if ($isWindows) {
        // Common XAMPP installations on Windows
        $possiblePaths = [
            'C:\\xampp\\mysql\\bin\\mysqldump.exe',
            'C:\\mysql\\bin\\mysqldump.exe',
            'mysqldump.exe' // Try PATH environment variable
        ];
    } else {
        // Unix-like systems
        $possiblePaths = [
            '/usr/bin/mysqldump',
            '/usr/local/bin/mysqldump',
            'mysqldump'
        ];
    }
    
    $mysqldumpPath = null;
    foreach ($possiblePaths as $path) {
        if (file_exists($path) || (!$isWindows && shell_exec("which " . escapeshellarg($path) . " 2>/dev/null"))) {
            $mysqldumpPath = $path;
            break;
        }
    }
    
    if (!$mysqldumpPath) {
        return [
            'success' => false,
            'message' => 'mysqldump executable not found. Please ensure MySQL is installed.',
            'filename' => null
        ];
    }
    
    // Build mysqldump command
    // --no-tablespaces: Avoid permission errors on Windows
    // --complete-insert: Includes column names for clarity
    // --no-create-db: Don't create database, just tables and data
    $command = escapeshellarg($mysqldumpPath)
        . " --user=" . escapeshellarg($username)
        . " --password=" . escapeshellarg($password)
        . " --host=" . escapeshellarg($host)
        . " --no-tablespaces"
        . " --complete-insert"
        . " " . escapeshellarg($dbname)
        . " > " . escapeshellarg($backupFilepath);
    
    // Execute mysqldump
    $output = null;
    $returnVar = null;
    exec($command, $output, $returnVar);
    
    // Check if backup was successful
    if ($returnVar !== 0 || !file_exists($backupFilepath) || filesize($backupFilepath) === 0) {
        return [
            'success' => false,
            'message' => 'mysqldump execution failed. Return code: ' . $returnVar,
            'filename' => null
        ];
    }
    
    return [
        'success' => true,
        'message' => 'Database backup created successfully',
        'filename' => $backupFilename
    ];
}

?>
