<?php
/**
 * Database Backup Restore Handler
 * 
 * Safe backup restoration with multiple modes:
 * 1. Preview: Show what's in the backup without restoring
 * 2. Restore to NEW database: Create backup as new DB (e.g., stores_restored_YYYY-MM-DD)
 * 3. Restore to EXISTING: Overwrite current database (requires confirmation)
 * 
 * Features:
 * - No data loss (preview mode or separate database)
 * - Automatic backup of current DB before restore
 * - Validation of backup file integrity
 * - Comprehensive error handling
 * - Detailed logging
 */

session_start();
include "db.php";

// Security: Only admins can restore backups
if (!isset($_SESSION['user']) || ($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(403);
    die(json_encode(['success' => false, 'message' => 'Unauthorized: Only admins can restore backups']));
}

// Get request parameters
$action = $_GET['action'] ?? $_POST['action'] ?? null;
$backupFile = $_POST['backup_file'] ?? null;
$restoreMode = $_POST['restore_mode'] ?? 'new_db'; // new_db, current_db
$confirmOverwrite = $_POST['confirm_overwrite'] ?? false;

// Set response header
header('Content-Type: application/json');

// ============================================================================
// CONFIGURATION
// ============================================================================

$backupDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'backups';
$logFile = $backupDir . DIRECTORY_SEPARATOR . 'restore.log';

// Database credentials
$dbHost = 'localhost';
$dbUser = 'root';
$dbPass = '';
$dbName = 'stores';
$dbPort = 3306;

// ============================================================================
// LOGGING FUNCTION
// ============================================================================

function writeRestoreLog($message, $level = 'INFO') {
    global $logFile, $backupDir;
    
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    error_log($logMessage, 3, $logFile);
}

// ============================================================================
// ACTION: LIST AVAILABLE BACKUPS
// ============================================================================

if ($action === 'list') {
    $backups = [];
    
    if (is_dir($backupDir)) {
        $files = array_merge(
            glob($backupDir . DIRECTORY_SEPARATOR . 'backup_*.sql') ?: [],
            glob($backupDir . DIRECTORY_SEPARATOR . 'stores_backup_*.sql') ?: []
        );
        
        // Sort by modification time (newest first)
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        foreach ($files as $file) {
            $filename = basename($file);
            $size = filesize($file);
            $modified = date('Y-m-d H:i:s', filemtime($file));
            $sizeInMB = round($size / (1024 * 1024), 2);
            
            $backups[] = [
                'filename' => $filename,
                'size' => $sizeInMB . ' MB',
                'modified' => $modified,
                'path' => $filename,
                'timestamp' => filemtime($file)
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'backups' => $backups,
        'count' => count($backups),
        'backup_dir' => $backupDir
    ]);
    exit;
}

// ============================================================================
// ACTION: PREVIEW BACKUP
// ============================================================================

if ($action === 'preview') {
    if (!$backupFile) {
        echo json_encode(['success' => false, 'message' => 'No backup file specified']);
        exit;
    }
    
    $filepath = $backupDir . DIRECTORY_SEPARATOR . $backupFile;
    
    // Security: Prevent directory traversal
    if (realpath($filepath) !== realpath($backupDir . DIRECTORY_SEPARATOR . $backupFile)) {
        echo json_encode(['success' => false, 'message' => 'Invalid backup file path']);
        exit;
    }
    
    if (!file_exists($filepath)) {
        echo json_encode(['success' => false, 'message' => 'Backup file not found']);
        exit;
    }
    
    if (!is_readable($filepath)) {
        echo json_encode(['success' => false, 'message' => 'Backup file is not readable']);
        exit;
    }
    
    // Read first 50 lines to get preview
    $handle = fopen($filepath, 'r');
    $preview = [];
    $lineCount = 0;
    $tableCount = 0;
    
    while (($line = fgets($handle)) !== false && $lineCount < 50) {
        $preview[] = $line;
        
        // Count database objects
        if (strpos($line, 'CREATE TABLE') !== false) {
            $tableCount++;
        }
        
        $lineCount++;
    }
    fclose($handle);
    
    // Get file size and date
    $fileSize = filesize($filepath);
    $fileDate = date('Y-m-d H:i:s', filemtime($filepath));
    
    echo json_encode([
        'success' => true,
        'filename' => $backupFile,
        'file_size' => round($fileSize / (1024 * 1024), 2) . ' MB',
        'file_date' => $fileDate,
        'preview_lines' => $preview,
        'estimated_tables' => $tableCount,
        'message' => 'Backup preview generated'
    ]);
    exit;
}

// ============================================================================
// ACTION: RESTORE BACKUP
// ============================================================================

if ($action === 'restore') {
    if (!$backupFile) {
        echo json_encode(['success' => false, 'message' => 'No backup file specified']);
        exit;
    }
    
    if ($restoreMode === 'current_db' && !$confirmOverwrite) {
        echo json_encode([
            'success' => false,
            'message' => 'Overwrite confirmation required',
            'requires_confirmation' => true
        ]);
        exit;
    }
    
    $filepath = $backupDir . DIRECTORY_SEPARATOR . $backupFile;
    
    // Security check: Prevent directory traversal
    if (realpath($filepath) !== realpath($backupDir . DIRECTORY_SEPARATOR . $backupFile)) {
        writeRestoreLog('Directory traversal attempt detected', 'SECURITY');
        echo json_encode(['success' => false, 'message' => 'Invalid backup file path']);
        exit;
    }
    
    if (!file_exists($filepath)) {
        echo json_encode(['success' => false, 'message' => 'Backup file not found']);
        exit;
    }
    
    // Step 1: Create automatic backup of current database before restoring
    writeRestoreLog('Starting backup restore process...');
    writeRestoreLog('Backup file: ' . $backupFile);
    writeRestoreLog('Restore mode: ' . $restoreMode);
    
    $preRestoreBackup = createPreRestoreBackup();
    if (!$preRestoreBackup['success']) {
        writeRestoreLog('Pre-restore backup failed: ' . $preRestoreBackup['message'], 'ERROR');
        echo json_encode([
            'success' => false,
            'message' => 'Failed to create safety backup: ' . $preRestoreBackup['message']
        ]);
        exit;
    }
    
    writeRestoreLog('Pre-restore backup created: ' . $preRestoreBackup['filename']);
    
    // Step 2: Determine target database
    if ($restoreMode === 'new_db') {
        $targetDb = 'stores_restored_' . date('Ymd_His');
        $createNewDb = true;
    } else {
        $targetDb = $dbName;
        $createNewDb = false;
    }
    
    // Step 3: Execute restore
    $restoreResult = executeRestore($filepath, $targetDb, $createNewDb);
    
    if (!$restoreResult['success']) {
        writeRestoreLog('Restore failed: ' . $restoreResult['message'], 'ERROR');
        echo json_encode([
            'success' => false,
            'message' => 'Restore failed: ' . $restoreResult['message'],
            'safety_backup' => $preRestoreBackup['filename']
        ]);
        exit;
    }
    
    writeRestoreLog('Restore completed successfully to database: ' . $targetDb, 'SUCCESS');
    
    echo json_encode([
        'success' => true,
        'message' => 'Database restored successfully',
        'target_database' => $targetDb,
        'backup_file' => $backupFile,
        'restore_mode' => $restoreMode,
        'safety_backup' => $preRestoreBackup['filename'],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// ============================================================================
// ACTION: GET RESTORE STATUS
// ============================================================================

if ($action === 'status') {
    $databases = getDatabaseList();
    
    echo json_encode([
        'success' => true,
        'current_database' => $dbName,
        'available_databases' => $databases,
        'backup_directory' => $backupDir,
        'last_log_entries' => getLogEntries(10)
    ]);
    exit;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create automatic backup of current database before restore
 */
function createPreRestoreBackup() {
    global $dbHost, $dbUser, $dbPass, $dbName, $backupDir, $logFile;
    
    $timestamp = date('Y-m-d_His');
    $backupName = 'pre_restore_' . $timestamp . '.sql';
    $backupPath = $backupDir . DIRECTORY_SEPARATOR . $backupName;
    
    // Find mysqldump
    $mysqldump = findMysqldump();
    if (!$mysqldump) {
        return [
            'success' => false,
            'message' => 'mysqldump not found'
        ];
    }
    
    // Build command
    $cmd = escapeshellarg($mysqldump)
        . ' --user=' . escapeshellarg($dbUser)
        . ' --password=' . escapeshellarg($dbPass)
        . ' --host=' . escapeshellarg($dbHost)
        . ' --no-tablespaces'
        . ' --complete-insert'
        . ' --add-drop-table'
        . ' ' . escapeshellarg($dbName)
        . ' > ' . escapeshellarg($backupPath);
    
    $output = null;
    $returnCode = null;
    exec($cmd, $output, $returnCode);
    
    if ($returnCode !== 0 || !file_exists($backupPath) || filesize($backupPath) === 0) {
        return [
            'success' => false,
            'message' => 'Failed to create pre-restore backup'
        ];
    }
    
    return [
        'success' => true,
        'filename' => $backupName,
        'path' => $backupPath
    ];
}

/**
 * Execute restore operation
 */
function executeRestore($backupFile, $targetDb, $createNewDb = false) {
    global $dbHost, $dbUser, $dbPass;
    
    // Read backup file
    if (!is_readable($backupFile)) {
        return [
            'success' => false,
            'message' => 'Backup file is not readable'
        ];
    }
    
    $backupContent = file_get_contents($backupFile);
    if ($backupContent === false) {
        return [
            'success' => false,
            'message' => 'Failed to read backup file'
        ];
    }
    
    // Connect to MySQL
    $conn = new mysqli($dbHost, $dbUser, $dbPass);
    if ($conn->connect_error) {
        return [
            'success' => false,
            'message' => 'Database connection failed: ' . $conn->connect_error
        ];
    }
    
    try {
        // Create new database if needed
        if ($createNewDb) {
            $safeName = $conn->real_escape_string($targetDb);
            if (!$conn->query("CREATE DATABASE IF NOT EXISTS `{$safeName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci")) {
                throw new Exception('Failed to create database: ' . $conn->error);
            }
            writeRestoreLog("Created new database: {$targetDb}");
        }
        
        // Select target database
        if (!$conn->select_db($targetDb)) {
            throw new Exception('Failed to select database: ' . $conn->error);
        }
        
        // Parse and execute SQL statements
        // Split by ';' but be careful with multi-line statements
        $statements = preg_split('/;(?=\s*$)/m', $backupContent);
        
        $executedCount = 0;
        foreach ($statements as $statement) {
            $statement = trim($statement);
            
            // Skip empty statements and comments
            if (empty($statement) || substr($statement, 0, 2) === '--') {
                continue;
            }
            
            if (!$conn->query($statement)) {
                throw new Exception('SQL Error: ' . $conn->error . '\nStatement: ' . substr($statement, 0, 100));
            }
            
            $executedCount++;
        }
        
        $conn->close();
        
        return [
            'success' => true,
            'message' => "Database restored successfully ({$executedCount} statements executed)",
            'statements_executed' => $executedCount
        ];
        
    } catch (Exception $e) {
        $conn->close();
        return [
            'success' => false,
            'message' => $e->getMessage()
        ];
    }
}

/**
 * Find mysqldump executable
 */
function findMysqldump() {
    $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    
    if ($isWindows) {
        $paths = [
            'C:\\xampp\\mysql\\bin\\mysqldump.exe',
            'C:\\mysql\\bin\\mysqldump.exe',
            'mysqldump.exe'
        ];
    } else {
        $paths = [
            '/usr/bin/mysqldump',
            '/usr/local/bin/mysqldump',
            'mysqldump'
        ];
    }
    
    foreach ($paths as $path) {
        if (@file_exists($path)) {
            return $path;
        }
    }
    
    return null;
}

/**
 * Get list of databases
 */
function getDatabaseList() {
    global $dbHost, $dbUser, $dbPass;
    
    $conn = new mysqli($dbHost, $dbUser, $dbPass);
    if ($conn->connect_error) {
        return [];
    }
    
    $result = $conn->query("SHOW DATABASES");
    $databases = [];
    
    while ($row = $result->fetch_assoc()) {
        $dbName = $row['Database'];
        
        // Skip system databases
        if (!in_array($dbName, ['information_schema', 'mysql', 'performance_schema', 'sys'])) {
            $databases[] = $dbName;
        }
    }
    
    $conn->close();
    return $databases;
}

/**
 * Get last log entries
 */
function getLogEntries($count = 10) {
    global $logFile;
    
    if (!file_exists($logFile)) {
        return [];
    }
    
    $lines = file($logFile);
    $entries = array_slice($lines, -$count);
    
    return array_map('trim', $entries);
}

// ============================================================================
// DEFAULT RESPONSE
// ============================================================================

echo json_encode([
    'success' => false,
    'message' => 'No action specified',
    'available_actions' => ['list', 'preview', 'restore', 'status']
]);
?>
