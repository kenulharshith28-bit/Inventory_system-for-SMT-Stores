# Reference Card - Daily Operations

## 📥 EXCEL EXPORT (Everyone)

**Download Work Order Report as Excel:**
```
1. Dashboard → Search section
2. Enter Work Order number
3. Click "Generate Report"
4. Click "📥 Download XLSX"
5. File downloads automatically
```

**Troubleshooting:**
```
If download fails:
  - Refresh page (Ctrl+Shift+R)
  - Wait 2 seconds
  - Try again
  - If still fails: Check internet connection
```

---

## 💾 BACKUP & RESTORE (Admin Only)

### Access Restore Manager
```
Direct Link: http://localhost/Stores/backend/backup_restore_manager.html

Or navigate:
1. HTTP://localhost/Stores/
2. URL bar → /backend/backup_restore_manager.html
3. Must be logged in as ADMIN
```

---

## 🔄 RESTORE A BACKUP (Admin)

### Quick Restore (Safest Way)
```
1. Open: backup_restore_manager.html
2. Click "Backups" tab
3. Find backup you want
4. Click "↩️ Restore"
5. Leave mode as "✅ Create New Database"
6. Click "Restore Selected Backup"
7. Wait for completion
8. Done! New DB created: stores_restored_YYYYMMDD

Result: 
  ✅ Original database untouched
  ✅ Backup restored to new DB
  ✅ No data loss
  ✅ Can verify before using
```

### Restore with Overwrite (If Needed)
```
⚠️ Use only when necessary!

1. Open: backup_restore_manager.html
2. Click "Backups" tab
3. Find backup
4. Click "↩️ Restore"
5. Select "⚠️ Overwrite Current Database"
6. Click "Restore Selected Backup"
7. See WARNING dialog
8. Click "Yes, Overwrite" (if sure)
9. System creates safety backup first
10. Restore begins
11. Wait for completion
12. Done! Database restored

Safety:
  ✅ Original backed up as: pre_restore_*.sql
  ✅ Can rollback if needed
  ✅ Requires admin confirmation
```

---

## 👁️ PREVIEW BEFORE RESTORING (Admin)

```
1. Open: backup_restore_manager.html
2. Click "Backups" tab
3. Find backup
4. Click "👁️ Preview"
5. See file details:
   - Size
   - Date/Time
   - Estimated tables
6. Decide if this is the right backup
7. If yes: Click "↩️ Restore"
```

---

## ⬇️ DOWNLOAD BACKUP (Admin)

```
1. Open: backup_restore_manager.html
2. Click "Backups" tab
3. Find backup
4. Click "⬇️ Download"
5. File saved locally
6. Use for migration or storage
```

---

## 📤 MANUAL UPLOAD (Admin)

```
1. Open: backup_restore_manager.html
2. Click "Manual Upload" tab
3. Click "Choose File"
4. Select .sql file
5. Choose mode:
   - ✅ Create New Database
   - ⚠️ Overwrite Current
6. Click "📤 Upload & Restore"
7. Wait for completion
```

---

## 📋 VIEW RESTORE HISTORY (Admin)

```
1. Open: backup_restore_manager.html
2. Click "Logs" tab
3. See recent restore activities
4. Timestamps show when operations occurred
5. Click "🔄 Refresh Logs" for latest
```

---

## 🔍 VERIFY BACKUP EXISTS (Admin)

```
1. Open: backup_restore_manager.html
2. Click "Backups" tab
3. See list with:
   - Filename
   - Size
   - Date/Time
4. Backups listed newest first
5. Should see 48 backups max
```

---

## 🕐 CHECK HOURLY BACKUPS (Admin)

```
1. Open: backend/backup_monitor.html
2. Click "📦 Backups" tab
3. See current backup stats:
   - Total count (should be ≤48)
   - Total size
   - Newest backup
   - Oldest backup
4. Click "🔄 Refresh Status" to update
5. Click "▶️ Run Backup Now" to create manual backup
```

---

## 📊 COMMON SCENARIOS

### Scenario 1: Deleted Data Recovery
```
Last week I accidentally deleted important data
What to do:
  1. Open backup_restore_manager.html
  2. Find backup from before deletion
  3. Click "👁️ Preview" to verify
  4. Click "↩️ Restore"
  5. Select "Create New Database"
  6. Restore
  7. Verify data in new DB
  8. If correct, migrate to main DB manually
```

### Scenario 2: Testing Changes
```
I want to test something without affecting production
What to do:
  1. Open backup_restore_manager.html
  2. Select latest backup
  3. Click "↩️ Restore"
  4. Use "Create New Database"
  5. Get stores_restored_* database
  6. Run tests on restored database
  7. Production database untouched
  8. If test passes: migrate changes to production
```

### Scenario 3: Regular Backup Verification
```
I want to verify backups are being created
What to do:
  1. Open backup_monitor.html
  2. Click "📦 Backups" tab
  3. Should see newest backup within last hour
  4. Check timestamp is recent
  5. If > 1 hour old: Investigate scheduler
```

### Scenario 4: Database Corruption
```
Database seems corrupted or slow
What to do:
  1. Create manual backup now (backup_monitor.html)
  2. Open backup_restore_manager.html
  3. Find clean backup from before issues started
  4. Preview to verify
  5. If overwrite needed:
     - Select "Overwrite Current"
     - Confirm overwrite
     - System creates pre_restore backup
     - Restore executes
     - Database recovered
  6. If successful: Done!
  7. If needed: Restore from pre_restore backup
```

---

## 🔑 KEY INFORMATION

### Files
```
Restore Manager:    /backend/backup_restore_manager.html
Backup Monitor:     /backend/backup_monitor.html
Backups Location:   /backups/
Restore API:        /backend/restore_backup.php
Documentation:      /backend/DATABASE_BACKUP_RESTORE_GUIDE.md
Quick Start:        /backend/QUICK_START.md
```

### Database Naming
```
Current database:     stores
Restored (new):       stores_restored_YYYYMMDD_HHMMSS
Safety backup:        pre_restore_YYYYMMDD_HHMMSS.sql
Hourly backups:       backup_YYYY-MM-DD_HH-MM.sql
```

### Limits
```
Max backups kept:     48
Backup retention:     ~2 days (48 × 1 hour)
Restore time:         2-5 minutes (typical)
Max database size:    Depends on disk space
```

---

## ⚡ QUICK COMMANDS

### Copy Backup Locally
```bash
Windows:
  copy C:\xampp\htdocs\Stores\backups\backup_2026-04-08_14-00.sql .

Linux/Mac:
  cp /var/www/Stores/backups/backup_2026-04-08_14-00.sql .
```

### Check Last Backup
```bash
Windows:
  dir /stat C:\xampp\htdocs\Stores\backups\backup*.sql

Linux:
  ls -la /var/www/Stores/backups/backup*.sql
```

### View Restore Log
```bash
Windows:
  type C:\xampp\htdocs\Stores\backups\restore.log

Linux:
  tail -f /var/www/Stores/backups/restore.log
```

---

## ✅ PRE-RESTORE CHECKLIST

Before important restore:
- [ ] Backup has recent data?
- [ ] Database not actively used?
- [ ] Disk space available (2x DB size)?
- [ ] Admin access logged in?
- [ ] Network connection stable?
- [ ] No critical operations running?

---

## ❌ ERROR SOLUTIONS

| Error | Solution |
|-------|----------|
| Cannot access restore UI | Login as ADMIN first |
| See "Excel library not loaded" | Refresh page, wait 2 sec |
| Restore fails: "No space" | Delete old backups, free space |
| Restore fails: "Permission denied" | Check /backups/ folder permissions |
| Backup list empty | Wait for hourly backup, or run manually |
| Logs not updated | Check file permissions on /backups/ |

---

## 📞 QUICK SUPPORT

**Issue:** Excel download not working
```
Checklist:
  ☐ Internet working?
  ☐ Refresh page?
  ☐ Console clean of errors?
  ☐ Try different browser?
  ☐ Disable extensions?
```

**Issue:** Restore won't start
```
Checklist:
  ☐ Logged in as admin?
  ☐ Backup file selected?
  ☐ Disk space available?
  ☐ Mode selected?
  ☐ Overwrite confirmed?
```

**Issue:** Backups not showing
```
Checklist:
  ☐ /backups/ directory exists?
  ☐ /backups/ has read permissions?
  ☐ Hourly backup scheduled?
  ☐ Task scheduler running?
  ☐ PHP running normally?
```

---

## 🎯 DECISION TREE

```
I want to restore a backup
  │
  ├─ Do I need to keep original DB?
  │   ├─ YES → Use "Create New Database" ✅
  │   └─ NO → Use "Overwrite Current" (with care)
  │
  ├─ Am I sure about this backup?
  │   ├─ NO → Preview first
  │   └─ YES → Proceed
  │
  ├─ Do I have reason to be cautious?
  │   ├─ YES → Use "Create New Database"
  │   └─ NO → Choose either mode
  │
  └─ Result:
      ── New DB mode → stores_restored_* created
      ── Overwrite → pre_restore_* safety backup created
      Either way → Original data preserved ✅
```

---

**Last Updated:** April 8, 2026  
**Quick Reference:** 1.0  
**For full details:** See DATABASE_BACKUP_RESTORE_GUIDE.md
