# Quick Start Guide - Excel Export & Backup Restore

## 🎯 What Was Fixed

### 1. Excel Export Error ✅
- **Issue:** "Excel export library not loaded" error
- **Solution:** Dual CDN fallback + async library detection
- **Result:** Reliable XLSX downloads with automatic retry

### 2. Unsafe Restore ✅
- **Issue:** Backup restore overwrites/conflicts with existing database
- **Solution:** Two restore modes + safety backups
- **Result:** Safe database restore without data loss

---

## 🚀 Quick Start (5 minutes)

### For Users (Excel Export)
1. Open dashboard and generate a Work Order report
2. Click "📥 Download XLSX"
3. File downloads - if first CDN slow, automatically tries second CDN
4. Done! ✅

### For Admins (Backup Restore)

#### Access the Dashboard
```
Go to: http://localhost/Stores/backend/backup_restore_manager.html
```

#### Restore a Backup (Safe Method)
```
1. Click "Backups" tab
2. Find backup you want
3. Click "↩️ Restore"
4. Select "✅ Create New Database" (default)
5. Click "Restore Selected Backup"
6. Get new database: stores_restored_20260408_143022
7. Done! Original database untouched ✅
```

#### Restore with Overwrite (if needed)
```
1. Click "Backups" tab
2. Find backup you want
3. Click "↩️ Restore"
4. Select "⚠️ Overwrite Current Database"
5. Click "Restore Selected Backup"
6. See confirmation dialog
7. Click "Yes, Overwrite"
8. System creates safety backup automatically
9. Restore begins
10. If something goes wrong, rollback available
11. Done! ✅
```

---

## 📂 Where to Find Things

| What | Where |
|------|-------|
| View/restore backups | `backend/backup_restore_manager.html` |
| Current backups | `/backups/backup_*.sql` |
| Safety backups | `/backups/pre_restore_*.sql` |
| Backup logs | `/backups/backup.log` |
| Restore logs | `/backups/restore.log` |
| Hourly backups | Still run automatically (unchanged) |
| Excel export | Any report → "Download XLSX" button |

---

## 🔍 How to Verify Everything Works

### Test 1: Excel Export
```javascript
1. Open any report in dashboard
2. F12 → Console tab
3. See: "✓ XLSX library loaded successfully"
4. Try download XLSX
5. Result: File downloads ✅
```

### Test 2: Restore Backup
```
1. Go to: backend/backup_restore_manager.html
2. Click "Backups" tab
3. See list of available backups ✅
4. Click "👁️ Preview" on any backup
5. See backup details ✅
6. Click "↩️ Restore" 
7. Select "Create New Database"
8. Click "Restore Selected Backup"
9. Wait for success message ✅
10. New database created: stores_restored_* ✅
```

### Test 3: Verify Hourly Backups
```
1. Go to: backend/backup_monitor.html
2. See "Backups" tab with list ✅
3. Should see backup_YYYY-MM-DD_HH-MM.sql files ✅
4. 48 most recent kept automatically ✅
```

---

## 💡 Key Features

### Excel Export
| Feature | Benefit |
|---------|---------|
| Dual CDN | Works even if one CDN down |
| Auto-retry | Waits up to 5 seconds for load |
| Fallback CDN | Automatic backup if primary fails |
| Clear errors | Tells you what went wrong |
| Console logs | Debug-friendly messages |

### Backup Restore
| Feature | Benefit |
|---------|---------|
| New Database | Original untouched |
| Safety Backup | Auto-backup before overwrite |
| Confirmation | Prevent accidental overwrites |
| Preview | See backup details first |
| Download | Save backups anywhere |
| Logs | Track all restore activity |
| Hourly Backups | Unaffected, still automatic |

---

## ⚠️ Important Notes

1. **Restore to new database by default** - no overwrite risk
2. **Hourly backups unchanged** - still run every 1 hour
3. **Max 48 backups kept** - oldest deleted automatically
4. **Admin-only access** - regular users can't restore
5. **Safety backups** - created automatically before overwrite
6. **No data loss** - multiple backup options available

---

## 🆘 Troubleshooting

### Excel Download Not Working
```
Issue: "Excel export library not loaded"

Fix #1: Refresh page
- F5 or Ctrl+Shift+R (hard refresh)
- Wait 2-3 seconds
- Try download again

Fix #2: Try different browser
- Chrome → Firefox
- Or different network

Fix #3: Check console
- F12 → Console
- Look for XLSX loading status
- If "✗ All XLSX CDNs failed"
- Contact admin or check internet
```

### Cannot See Backups
```
Issue: Empty backup list

Fix: Check permissions
1. Verify /backups directory exists
2. Check file permissions
3. Verify admin login
4. Clear browser cache
5. Try different browser
```

### Restore Failing
```
Issue: Restore process fails

Fix:
1. Check available disk space
2. Verify backup file not corrupted
3. Wait for completion (can take 1-5 min)
4. Check restore.log for error details
5. Try "Create New Database" mode first
```

---

## 📞 Support Quick Links

| Issue | Check |
|-------|-------|
| Excel export fails | Browser console (F12) + internet connection |
| Restore won't start | Admin login + available disk space |
| Backups not showing | Permissions + /backups directory |
| Hourly backups missing | Task Scheduler/Cron job + PHP path |
| Database permission denied | MySQL user credentials + database access |

---

## 🎓 Common Tasks

### I need to restore yesterday's backup
```
1. Open backup_restore_manager.html
2. Click "Backups" tab
3. Find backup from yesterday (check date/time)
4. Click "↩️ Restore"
5. Use "Create New Database" to be safe
6. Get new database with yesterday's data
```

### I want to just backup the database now
```
1. Open backup_monitor.html
2. Click "▶️ Run Backup Now" button
3. Wait for completion
4. New backup appears in list
```

### I accidentally deleted important data
```
1. Open backup_restore_manager.html
2. Find recent backup before deletion
3. Click "👁️ Preview" to verify
4. Click "↩️ Restore"
5. Choose mode:
   - "New DB" to keep current + have old data
   - "Overwrite" to completely replace (not recommended)
6. Restore
7. Data recovered ✅
```

### I want to test database changes safely
```
1. Open backup_restore_manager.html
2. Click "Backups" tab
3. Find current backup
4. Click "↩️ Restore"
5. Select "Create New Database"
6. Restore
7. Now have stores_restored_* for testing
8. Production stores database untouched
9. Test safely! ✅
```

---

## 📊 Performance

| Operation | Time |
|-----------|------|
| List backups | <1 second |
| Preview backup | 1-2 seconds |
| Restore (new db) | 2-5 minutes* |
| Restore (overwrite) | 2-5 minutes* |
| Download backup | Depends on file size |
| Create hourly backup | 30-60 seconds* |

*Depends on database size

---

## 🔐 Security

✅ **What's Protected**
- Admin-only access required
- Automatic safety backups
- File path validation
- Session authentication
- Comprehensive logging
- Error recovery

✅ **What's Backed Up**
- Database schema
- All data
- Transaction logs
- Complete database state

✅ **What's NOT Lost**
- Original database (when using "New DB" mode)
- Data if restore fails
- Can rollback anytime

---

## 📋 Files Reference

| File | Purpose | Access |
|------|---------|--------|
| backup_restore_manager.html | Restore UI | Admin only |
| backup_monitor.html | View backups | Admin only |
| restore_backup.php | Restore API | Admin only |
| backup_automation.php | Hourly backup | Auto (hourly) |
| backup.log | Hourly log | Admin |
| restore.log | Restore log | Admin |

---

## ✅ Verification Checklist

After setup, verify:
- [ ] Excel export works
- [ ] Backup list shows files
- [ ] Can preview backup
- [ ] Can restore to new database
- [ ] Can preview new database
- [ ] Hourly backups still running
- [ ] Admin can see restore UI
- [ ] Non-admin cannot access restore
- [ ] Logs updated after operations

---

**Last Updated:** April 8, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅

Need help? Check `/backend/DATABASE_BACKUP_RESTORE_GUIDE.md` for detailed documentation.
