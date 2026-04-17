<?php
/**
 * Database Backup Automation Script
 * 
 * Purpose:
 * - Automatically creates database backups every 1 hour
 * - Maintains only the 48 most recent backups
 * - Safe deletion (only if new backup succeeds)
 * - Comprehensive error handling and logging
 * 
 * Setup:
 * 1. Configure settings below
 * 2. Add to cron: every hour, e.g. `0 * * * * php /path/to/backup_automation.php`
 * 3. Or call via web: http://localhost/Stores/backend/backup_automation.php
 */

// ============================================================================
// CONFIGURATION - Edit these settings
// ============================================================================

// Database Credentials
$DB_CONFIG = [
    'host'     => 'localhost',
    'username' => 'root',
    'password' => '',
    'database' => 'stores',
    'port'     => '3306'
];

// Backup Settings
$BACKUP_CONFIG = [
    'backup_dir'           => dirname(dirname(__FILE__)) . DIRECTORY_SEPARATOR . 'backups',
    'max_backups'          => 48,                    // Keep only 48 backups
    'backup_prefix'        => 'backup_',             // Filename prefix
    'backup_extension'     => '.sql',                // File extension
    'timestamp_format'     => 'Y-m-d_H-i-s-u',      // YYYY-MM-DD_HH-MM-SS-microseconds format
    'mysqldump_timeout'    => 300,                   // Timeout in seconds
    'enable_logging'       => true,
    'log_file'            => null                    // null = auto-detect
];

// Set log file path if not specified
if ($BACKUP_CONFIG['enable_logging'] && $BACKUP_CONFIG['log_file'] === null) {
    $BACKUP_CONFIG['log_file'] = $BACKUP_CONFIG['backup_dir'] . DIRECTORY_SEPARATOR . 'backup.log';
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Write log message with timestamp
 * 
 * @param string $message Log message
 * @param string $level Log level (INFO, WARNING, ERROR, SUCCESS)
 */
function writeLog($message, $level = 'INFO') {
    global $BACKUP_CONFIG;
    
    if (!$BACKUP_CONFIG['enable_logging']) {
        return;
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    
    if (!is_dir($BACKUP_CONFIG['backup_dir'])) {
        mkdir($BACKUP_CONFIG['backup_dir'], 0755, true);
    }
    
    error_log($logMessage, 3, $BACKUP_CONFIG['log_file']);
}

// ============================================================================
// CORE BACKUP FUNCTIONS
// ============================================================================

/**
 * Create database backup using mysqldump
 * 
 * @return array ['success' => bool, 'filename' => string|null, 'message' => string]
 */
function createBackup() {
    global $DB_CONFIG, $BACKUP_CONFIG;
    
    writeLog('Starting backup process...');
    
    // Validate backup directory
    if (!is_dir($BACKUP_CONFIG['backup_dir'])) {
        if (!mkdir($BACKUP_CONFIG['backup_dir'], 0755, true)) {
            $msg = 'Failed to create backup directory: ' . $BACKUP_CONFIG['backup_dir'];
            writeLog($msg, 'ERROR');
            return ['success' => false, 'filename' => null, 'message' => $msg];
        }
        writeLog('Created backup directory');
    }
    
    // Verify directory is writable
    if (!is_writable($BACKUP_CONFIG['backup_dir'])) {
        $msg = 'Backup directory is not writable';
        writeLog($msg, 'ERROR');
        return ['success' => false, 'filename' => null, 'message' => $msg];
    }
    
    // Generate filename with timestamp
    $timestamp = (new DateTimeImmutable('now'))->format($BACKUP_CONFIG['timestamp_format']);
    $filename = $BACKUP_CONFIG['backup_prefix'] . $timestamp . $BACKUP_CONFIG['backup_extension'];
    $filepath = $BACKUP_CONFIG['backup_dir'] . DIRECTORY_SEPARATOR . $filename;
    
    writeLog('Generating backup: ' . $filename);
    
    // Check if mysqldump exists and is executable
    $mysqldumpPath = findMysqldump();
    if (!$mysqldumpPath) {
        $msg = 'mysqldump executable not found in system PATH';
        writeLog($msg, 'ERROR');
        return ['success' => false, 'filename' => null, 'message' => $msg];
    }
    
    writeLog('Found mysqldump at: ' . $mysqldumpPath);
    
    // Build mysqldump command with proper escaping
    $command = buildMysqldumpCommand($mysqldumpPath, $filepath);
    
    writeLog('Executing backup command...');
    
    // Execute mysqldump
    $output = [];
    $returnCode = 0;
    exec($command, $output, $returnCode);
    
    // Validate backup success
    if ($returnCode !== 0) {
        $msg = "mysqldump failed with code {$returnCode}";
        writeLog($msg, 'ERROR');
        writeLog('Output: ' . implode(' ', $output), 'ERROR');
        
        // Clean up failed backup file
        if (file_exists($filepath)) {
            unlink($filepath);
        }
        
        return ['success' => false, 'filename' => null, 'message' => $msg];
    }
    
    // Verify backup file exists and has content
    if (!file_exists($filepath)) {
        $msg = 'Backup file was not created';
        writeLog($msg, 'ERROR');
        return ['success' => false, 'filename' => null, 'message' => $msg];
    }
    
    $fileSize = filesize($filepath);
    if ($fileSize === 0) {
        $msg = 'Backup file is empty';
        writeLog($msg, 'ERROR');
        unlink($filepath);
        return ['success' => false, 'filename' => null, 'message' => $msg];
    }
    
    $sizeInMB = round($fileSize / (1024 * 1024), 2);
    $msg = "Backup created successfully ({$sizeInMB} MB)";
    writeLog($msg, 'SUCCESS');
    
    return ['success' => true, 'filename' => $filename, 'message' => $msg];
}

/**
 * Find mysqldump executable in system PATH
 * 
 * @return string|null Path to mysqldump or null if not found
 */
function findMysqldump() {
    $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    
    // Common installation paths
    if ($isWindows) {
        $possiblePaths = [
            'C:\\xampp\\mysql\\bin\\mysqldump.exe',
            'C:\\mysql\\bin\\mysqldump.exe',
            'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
            'C:\\Program Files (x86)\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe',
            'mysqldump.exe'
        ];
    } else {
        $possiblePaths = [
            '/usr/bin/mysqldump',
            '/usr/local/bin/mysqldump',
            '/opt/mysql/bin/mysqldump',
            'mysqldump'
        ];
    }
    
    foreach ($possiblePaths as $path) {
        if (@file_exists($path)) {
            return $path;
        }
        
        // Try 'which' command on Unix-like systems
        if (!$isWindows && shell_exec("which " . escapeshellarg($path) . " 2>/dev/null")) {
            return $path;
        }
    }
    
    // Try 'where' command on Windows
    if ($isWindows) {
        $result = shell_exec("where mysqldump.exe 2>nul");
        if ($result) {
            return trim($result);
        }
    }
    
    return null;
}

/**
 * Build mysqldump command with proper parameters
 * 
 * @param string $mysqldumpPath Path to mysqldump executable
 * @param string $outputPath Path where backup will be saved
 * @return string Escape command ready for exec()
 */
function buildMysqldumpCommand($mysqldumpPath, $outputPath) {
    global $DB_CONFIG;
    
    // mysqldump options:
    // --user: Database user
    // --password: Database password
    // --host: Database host
    // --port: Database port
    // --no-tablespaces: Avoid permission errors on Windows
    // --complete-insert: Include column names in INSERT statements
    // --add-drop-table: Add DROP TABLE before CREATE TABLE
    // --no-create-db: Don't include CREATE DATABASE statement
    // --lock-tables: Lock tables during backup (safer)
    
    $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    
    $cmd = escapeshellarg($mysqldumpPath);
    $cmd .= ' --user=' . escapeshellarg($DB_CONFIG['username']);
    
    // Only add password if it's not empty
    if (!empty($DB_CONFIG['password'])) {
        $cmd .= ' --password=' . escapeshellarg($DB_CONFIG['password']);
    }
    
    $cmd .= ' --host=' . escapeshellarg($DB_CONFIG['host']);
    $cmd .= ' --port=' . escapeshellarg($DB_CONFIG['port']);
    $cmd .= ' --no-tablespaces';
    $cmd .= ' --complete-insert';
    $cmd .= ' --add-drop-table';
    $cmd .= ' --no-create-db';
    $cmd .= ' ' . escapeshellarg($DB_CONFIG['database']);
    
    // Redirect output to file
    if ($isWindows) {
        $cmd .= ' > ' . escapeshellarg($outputPath);
    } else {
        $cmd .= ' > ' . escapeshellarg($outputPath) . ' 2>/dev/null';
    }
    
    return $cmd;
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

/**
 * Delete old backups, keeping only the most recent ones
 * 
 * Only called after a successful new backup
 * 
 * @param int $keepCount Number of recent backups to keep
 * @return array ['deleted_count' => int, 'deleted_files' => array, 'message' => string]
 */
function deleteOldBackups($keepCount) {
    global $BACKUP_CONFIG;
    
    writeLog("Cleaning up old backups (keeping {$keepCount} most recent)...");
    
    $backupDir = $BACKUP_CONFIG['backup_dir'];
    
    if (!is_dir($backupDir)) {
        return ['deleted_count' => 0, 'deleted_files' => [], 'message' => 'Backup directory not found'];
    }
    
    // Get all backup files
    $files = glob($backupDir . DIRECTORY_SEPARATOR . $BACKUP_CONFIG['backup_prefix'] . '*' . $BACKUP_CONFIG['backup_extension']);
    
    if (!$files || count($files) <= $keepCount) {
        $msg = 'No old backups to delete (' . count($files ?? []) . ' files)';
        writeLog($msg, 'INFO');
        return ['deleted_count' => 0, 'deleted_files' => [], 'message' => $msg];
    }
    
    // Sort files by modification time (newest first)
    usort($files, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });
    
    // Calculate how many to delete
    $toDeleteCount = count($files) - $keepCount;
    $deletedFiles = [];
    
    // Delete oldest files
    for ($i = $keepCount; $i < count($files); $i++) {
        $file = $files[$i];
        if (unlink($file)) {
            $filename = basename($file);
            $deletedFiles[] = $filename;
            writeLog("Deleted old backup: {$filename}", 'INFO');
        } else {
            writeLog("Failed to delete: " . basename($file), 'WARNING');
        }
    }
    
    $msg = "Deleted {$toDeleteCount} old backup(s)";
    writeLog($msg, 'SUCCESS');
    
    return [
        'deleted_count' => count($deletedFiles),
        'deleted_files' => $deletedFiles,
        'message' => $msg
    ];
}

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

/**
 * Get backup statistics
 * 
 * @return array Backup information
 */
function getBackupStats() {
    global $BACKUP_CONFIG;
    
    $backupDir = $BACKUP_CONFIG['backup_dir'];
    
    if (!is_dir($backupDir)) {
        return [
            'backup_count' => 0,
            'backups' => [],
            'total_size' => 0,
            'oldest_backup' => null,
            'newest_backup' => null
        ];
    }
    
    $files = glob($backupDir . DIRECTORY_SEPARATOR . $BACKUP_CONFIG['backup_prefix'] . '*' . $BACKUP_CONFIG['backup_extension']);
    if (!$files) {
        $files = [];
    }
    
    // Sort by modification time (newest first)
    usort($files, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });
    
    $totalSize = 0;
    $backups = [];
    
    foreach ($files as $file) {
        $size = filesize($file);
        $totalSize += $size;
        
        $backups[] = [
            'filename' => basename($file),
            'size_bytes' => $size,
            'size_mb' => round($size / (1024 * 1024), 2),
            'modified' => date('Y-m-d H:i:s', filemtime($file)),
            'timestamp' => filemtime($file)
        ];
    }
    
    return [
        'backup_count' => count($files),
        'backups' => $backups,
        'total_size' => $totalSize,
        'total_size_mb' => round($totalSize / (1024 * 1024), 2),
        'oldest_backup' => count($backups) > 0 ? end($backups) : null,
        'newest_backup' => count($backups) > 0 ? reset($backups) : null,
        'max_backups' => $BACKUP_CONFIG['max_backups']
    ];
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
    global $BACKUP_CONFIG;
    
    writeLog('========================================');
    writeLog('Database Backup Automation Started');
    writeLog('========================================');
    
    // Step 1: Create new backup
    $backupResult = createBackup();
    
    if (!$backupResult['success']) {
        writeLog('Backup failed. Exiting without cleanup.', 'ERROR');
        
        return [
            'success' => false,
            'message' => 'Backup creation failed: ' . $backupResult['message'],
            'backup' => $backupResult,
            'cleanup' => null,
            'stats' => getBackupStats()
        ];
    }
    
    // Step 2: Clean up old backups (only after successful backup)
    $cleanupResult = deleteOldBackups($BACKUP_CONFIG['max_backups']);
    
    $stats = getBackupStats();
    
    writeLog('========================================');
    writeLog('Backup process completed successfully');
    writeLog('========================================');
    
    return [
        'success' => true,
        'message' => 'Backup and cleanup completed successfully',
        'backup' => $backupResult,
        'cleanup' => $cleanupResult,
        'stats' => $stats
    ];
}

// Execute main function
$result = main();

// ============================================================================
// OUTPUT
// ============================================================================

// Set appropriate header based on request type
$isAjax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest';
$isWebRequest = isset($_GET['format']) || $isAjax;

if ($isWebRequest || $isAjax) {
    header('Content-Type: application/json');
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} else {
    // CLI output
    echo "\n" . str_repeat("=", 50) . "\n";
    echo "Database Backup Automation Result\n";
    echo str_repeat("=", 50) . "\n\n";
    
    echo "Status: " . ($result['success'] ? "✓ SUCCESS" : "✗ FAILED") . "\n";
    echo "Message: " . $result['message'] . "\n\n";
    
    if ($result['backup']) {
        echo "--- Backup Details ---\n";
        echo "File: " . ($result['backup']['filename'] ?? 'N/A') . "\n";
        echo "Result: " . $result['backup']['message'] . "\n\n";
    }
    
    if ($result['cleanup']) {
        echo "--- Cleanup Details ---\n";
        echo "Deleted: " . $result['cleanup']['deleted_count'] . " file(s)\n";
        echo "Message: " . $result['cleanup']['message'] . "\n\n";
    }
    
    if ($result['stats']) {
        echo "--- Backup Statistics ---\n";
        echo "Total Backups: " . $result['stats']['backup_count'] . " / " . $result['stats']['max_backups'] . "\n";
        echo "Total Size: " . $result['stats']['total_size_mb'] . " MB\n";
        echo "Newest: " . ($result['stats']['newest_backup']['filename'] ?? 'N/A') . "\n";
        echo "Oldest: " . ($result['stats']['oldest_backup']['filename'] ?? 'N/A') . "\n";
    }
    
    echo "\n" . str_repeat("=", 50) . "\n";
}

exit($result['success'] ? 0 : 1);
?>
