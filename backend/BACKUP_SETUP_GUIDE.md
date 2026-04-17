# Database Backup Automation Setup Guide

## Overview

This comprehensive backup solution automatically creates database backups every hour and maintains only the 48 most recent backups. It includes error handling, logging, and multiple scheduling options.

## Files Included

1. **backup_automation.php** - Main backup script (production-ready)
2. **scheduler.php** - PHP wrapper for cron jobs
3. **batch_backup_scheduler.bat** - Windows Task Scheduler batch file
4. **SETUP_GUIDE.md** - This file

## Features

✓ Automatic hourly backups
✓ Filename format: `backup_YYYY-MM-DD_HH-MM.sql` (e.g., backup_2026-04-08_14-00.sql)
✓ Keeps only 48 most recent backups
✓ Safe deletion (only after successful backup)
✓ Comprehensive error handling
✓ Detailed logging to `/backups/backup.log`
✓ Statistics and monitoring
✓ Cross-platform compatible

## Quick Start

### Option 1: Windows Task Scheduler (Recommended for Windows)

1. **Open Task Scheduler:**
   - Press `Win + R`
   - Type `taskschd.msc`
   - Press Enter

2. **Create New Task:**
   - Right-click "Task Scheduler Library"
   - Select "Create Basic Task"
   - Name: "Database Backup"
   - Description: "Automatic hourly database backup"

3. **Set Trigger:**
   - Click "Trigger" tab → "New"
   - Select: "Daily"
   - Set time to any time (e.g., 12:00 AM)
   - Check "Repeat task every: 1 hour" ✓
   - Duration: "Indefinitely"
   - Click OK

4. **Set Action:**
   - Click "Action" tab → "New"
   - Action: "Start a program"
   - Program: `C:\xampp\php\php.exe`
   - Arguments: `"C:\xampp\htdocs\Stores\backend\backup_automation.php"`
   - Start in: `C:\xampp\htdocs\Stores\backend`
   - Click OK

5. **Set Conditions:**
   - Click "Conditions" tab
   - Uncheck options that might prevent execution
   - Click OK

6. **Run Test:**
   - Right-click task
   - Select "Run"
   - Check `/backups/backup.log` for success message

### Option 2: Linux/Mac Cron (Alternative)

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs every hour at minute 0)
0 * * * * /usr/bin/php /path/to/Stores/backend/backup_automation.php

# Or use the scheduler wrapper
0 * * * * /path/to/Stores/backend/scheduler.php
```

### Option 3: Manual Testing

From command line:
```bash
# Windows
C:\xampp\php\php.exe C:\xampp\htdocs\Stores\backend\backup_automation.php

# Linux/Mac
php /var/www/Stores/backend/backup_automation.php
```

From web browser:
```
http://localhost/Stores/backend/backup_automation.php
```

With JSON output:
```
http://localhost/Stores/backend/backup_automation.php?format=json
```

## Configuration

Edit these settings in `backup_automation.php` (lines 24-50):

```php
$DB_CONFIG = [
    'host'     => 'localhost',       // Database host
    'username' => 'root',            // Database user
    'password' => '',                // Database password
    'database' => 'stores',          // Database name
    'port'     => '3306'             // MySQL port
];

$BACKUP_CONFIG = [
    'backup_dir'        => '..../backups',  // Backup directory
    'max_backups'       => 48,              // Keep 48 backups
    'backup_prefix'     => 'backup_',       // Filename prefix
    'backup_extension'  => '.sql',          // File extension
    'timestamp_format'  => 'Y-m-d_H-i',    // YYYY-MM-DD_HH-MM
    'enable_logging'    => true,            // Enable logs
    'log_file'         => null              // Auto-detected
];
```

## Monitoring & Logs

### Check Backup Log

```bash
# View last 20 entries
tail -20 /path/to/backups/backup.log

# Watch live updates (Linux/Mac)
tail -f /path/to/backups/backup.log

# Windows (PowerShell)
Get-Content C:\xampp\htdocs\Stores\backups\backup.log -Tail 20 -Wait
```

### Log Format

```
[2026-04-08 14:00:15] [INFO] Starting backup process...
[2026-04-08 14:00:15] [SUCCESS] Database backup created successfully (12.34 MB)
[2026-04-08 14:00:16] [SUCCESS] Deleted 1 old backup(s)
```

### Get Statistics

Call the script from web with stats request:

```javascript
// From JavaScript
fetch('backend/backup_automation.php?format=json')
    .then(res => res.json())
    .then(data => console.log(data.stats));
```

Response includes:
- backup_count: Number of backups
- total_size_mb: Total size of all backups
- newest_backup: Latest backup details
- oldest_backup: Oldest backup details
- max_backups: Maximum backups to keep

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Backup and cleanup completed successfully",
  "backup": {
    "success": true,
    "filename": "backup_2026-04-08_14-00.sql",
    "message": "Backup created successfully (12.34 MB)"
  },
  "cleanup": {
    "deleted_count": 1,
    "deleted_files": ["backup_2026-04-07_13-00.sql"],
    "message": "Deleted 1 old backup(s)"
  },
  "stats": {
    "backup_count": 48,
    "total_size_mb": 576.50,
    "newest_backup": {
      "filename": "backup_2026-04-08_14-00.sql",
      "size_mb": 12.34,
      "modified": "2026-04-08 14:00:15"
    },
    "oldest_backup": {
      "filename": "backup_2026-03-21_14-00.sql",
      "size_mb": 12.10,
      "modified": "2026-03-21 14:00:20"
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Backup creation failed: mysqldump executable not found",
  "backup": {
    "success": false,
    "filename": null,
    "message": "mysqldump executable not found in system PATH"
  },
  "cleanup": null,
  "stats": { ... }
}
```

## Troubleshooting

### Problem: "mysqldump executable not found"

**Solution:**
1. Verify MySQL is installed
2. Check XAMPP MySQL installation
3. Update `mysqldump` path in script:
   - Windows: `C:\xampp\mysql\bin\mysqldump.exe`
   - Linux: `/usr/bin/mysqldump`
   - Mac: `/usr/local/bin/mysqldump`

### Problem: "Backup directory is not writable"

**Solution:**
```bash
# Linux/Mac - Set permissions
chmod 755 /path/to/backups

# Windows - Right-click → Properties → Security → Edit permissions
```

### Problem: `Task never runs in Task Scheduler`

**Solution:**
1. Check scheduler logs: View "History" in Task Scheduler
2. Verify PHP path is correct
3. Test manually first
4. Ensure task is enabled
5. Check "Run with highest privileges" option

### Problem: Backup file is empty

**Solution:**
1. Check database credentials in config
2. Test connection manually:
   ```bash
   mysql -h localhost -u root stores -e "SELECT 1;"
   ```
3. Verify database exists and has tables
4. Check log file for specific error

### Problem: Old backups not deleting

**Solution:**
1. Check backup directory permissions
2. Verify only successful backups trigger cleanup
3. Check log for deletion errors
4. Manually verify oldest files can be deleted

## Security Recommendations

1. **Protect backup directory:**
   ```bash
   # Linux/Mac
   chmod 700 /path/to/backups
   
   # Windows - Restrict access via NTFS permissions
   ```

2. **Encrypt sensitive config:**
   - Don't commit credentials to version control
   - Use environment variables if possible
   - Restrict file access (chmod 600)

3. **Backup location:**
   - Store on separate drive/partition
   - Consider cloud backup (Google Drive, AWS, etc.)
   - Maintain offsite backup

4. **Monitor backups:**
   - Set up alerts for backup failures
   - Check log file regularly
   - Test restore procedures

## Restore Instructions

### Restore from backup

```bash
# Linux/Mac
mysql -h localhost -u root stores < /path/to/backups/backup_2026-04-08_14-00.sql

# Windows (Command Prompt)
C:\xampp\mysql\bin\mysql.exe -h localhost -u root stores < C:\xampp\htdocs\Stores\backups\backup_2026-04-08_14-00.sql

# Windows (PowerShell)
Get-Content C:\xampp\htdocs\Stores\backups\backup_2026-04-08_14-00.sql | & "C:\xampp\mysql\bin\mysql.exe" -h localhost -u root stores
```

### Restore with phpmyadmin

1. Open phpMyAdmin
2. Select database
3. Click "Import" tab
4. Select backup SQL file
5. Click "Import" button

## Advanced Configuration

### Custom backup directory per database

Edit array in config section:
```php
$BACKUP_CONFIG = [
    'backup_dir' => '/mnt/backups/stores',  // Different location
    'max_backups' => 96,                    // Keep 96 backups (4 days)
    // ... other settings
];
```

### Change backup filename format

```php
'timestamp_format' => 'Y-m-d_H-i-s',  // YYYY-MM-DD_HH-MM-SS
'backup_prefix'    => 'stores_bak_',  // Custom prefix
'backup_extension' => '.sql.gz',       // Custom extension
```

Note: If changing extensions, also update glob patterns in code.

### Adjust retention policy

```php
'max_backups' => 168,  // Keep 7 days of hourly backups (7*24)
'max_backups' => 720,  // Keep 30 days of backups (30*24)
```

## Performance Notes

- **Memory:** ~512MB (configured in script)
- **Time:** Depends on database size
  - 10 MB database: ~1 second
  - 100 MB database: ~5-10 seconds
  - 1 GB database: ~30-60 seconds
  
- **Disk space:** 48 backups × avg size
  - Example: 48 × 12 MB = 576 MB total

## Support & Logs

For issues, check:
1. `/backups/backup.log` - Main log file
2. `/backups/backup_scheduler.log` - Windows scheduler log
3. PHP error log (usually in /var/log or Event Viewer)
4. MySQL error log

Include log entries when reporting issues.

## License

Production-ready, free to use and modify.

---

**Last Updated:** 2026-04-08
**Maintenance:** Check backup logs monthly and test restore procedure quarterly.
