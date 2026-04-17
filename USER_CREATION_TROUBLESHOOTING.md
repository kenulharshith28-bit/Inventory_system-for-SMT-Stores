# User Creation System - Troubleshooting Guide

## Quick Diagnosis

### Symptom: "Users" tab not visible in sidebar
**Cause:** Not logged in as admin  
**Solution:** 
```
1. Logout (click Logout button)
2. Login as admin user
3. Users tab should now appear in sidebar
```

---

### Symptom: Click "Users" tab → Nothing happens
**Cause:** script.js not loading or showSection() broken  
**Solution:**
```
1. Open DevTools (F12)
2. Go to Console tab
3. Type: showSection('users')
4. Press Enter
5. If error appears, check that script.js is loading in HTML
```

**Check:**
- Right-click dashboard.html > View Source
- Search for `<script src="script.js">`
- Should appear near top of script section

---

### Symptom: "Create Account" button does nothing
**Cause:** JavaScript error or form issue  
**Solution:**
```
1. Open DevTools (F12)
2. Go to Console tab
3. You should see logs like:
   === CREATE USER ATTEMPT ===
   Username: ...
   Password length: ...
```

**If no logs appear:**
- Check console for errors (red messages)
- Verify createUser() function exists
- Check onclick="createUser()" on button

---

### Symptom: "Error: unauthorized - only admins can create users"
**Cause:** Session not authenticated or not admin  
**Solution:**
```
1. Verify you're logged in as admin
2. Check console:
   - Open DevTools (F12)
   - Type: fetch('../backend/check_auth.php').then(r=>r.json()).then(d=>console.log(d))
   - Verify user shows 'admin' role
```

**If not admin:**
```sql
-- Check if admin user exists
SELECT username, role FROM users WHERE role = 'admin';

-- If no admin, must create one directly in MySQL:
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

---

### Symptom: Server returns "error: username already exists"
**Cause:** Username is taken  
**Solution:**
```
1. Use a different username
2. Or check if user already created:
   SELECT * FROM users WHERE username = 'testuser';
3. Delete if needed:
   DELETE FROM users WHERE username = 'testuser' AND role = 'user';
```

---

### Symptom: "Network error" or "Connection failed"
**Cause:** Backend not reachable  
**Solution:**
```
1. Verify XAMPP is running
   - Check XAMPP Control Panel
   - Apache should be green
   - MySQL should be green

2. Verify correct path:
   - Console should log: "Sending POST to: ../backend/create_user.php"
   - Check path is relative and correct from dashboard.html location

3. Test connection:
   - Open: http://localhost/Stores/backend/check_auth.php
   - Should return JSON, not blank or error
```

---

### Symptom: Form submission succeeds but user not in table
**Cause:** loadUsers() failed  
**Solution:**
```
1. Manually call loadUsers() in console (F12):
   loadUsers()
   
2. Check console output

3. If error: "Failed to load users"
   - Check get_users.php is working
   - Verify admin access
```

---

### Symptom: "502 Bad Gateway" or "500 Internal Server Error"
**Cause:** Backend error  
**Solution:**
```
1. Check PHP error log:
   - Windows: C:\xampp\apache\logs\error.log
   - Linux: /var/log/apache2/error.log

2. Check MySQL connection:
   - Verify MySQL is running
   - Check db.php credentials are correct
   - Verify users table exists

3. Test database:
   - Open: http://localhost/phpmyadmin
   - Navigate to: stores > users table
   - Verify table structure is correct
```

---

### Symptom: Form shows but fields are not working
**Cause:** CSS or JavaScript conflict  
**Solution:**
```
1. Check console for JavaScript errors (F12 > Console)

2. Verify element IDs:
   - Right-click form > Inspect (F12)
   - Check IDs: new_username, new_password, assign_role
   - Should match function: getElementById('new_username')

3. Test form submission manually:
   fetch('../backend/create_user.php', {
     method: 'POST',
     body: new URLSearchParams({
       username: 'test123',
       password: 'test1234',
       role: 'user'
     })
   }).then(r => r.text()).then(console.log)
```

---

## Browser Console Testing

### Test 1: Check Authentication
```javascript
// What user are you?
fetch('../backend/check_auth.php')
  .then(r => r.json())
  .then(d => console.log(d))
```

**Expected output:**
```json
{
  "user": "admin",
  "role": "admin"
}
```

---

### Test 2: Create User Manually
```javascript
// Create test user
const formData = new URLSearchParams();
formData.append('username', 'testuser123');
formData.append('password', 'test1234');
formData.append('role', 'user');

fetch('../backend/create_user.php', {
  method: 'POST',
  body: formData
})
.then(r => r.text())
.then(result => console.log('Result:', result))
.catch(err => console.error('Error:', err))
```

**Expected output:**
```
Result: created
```

---

### Test 3: Check Users List
```javascript
// Get all users
fetch('../backend/get_users.php')
  .then(r => r.json())
  .then(data => {
    console.log('Users:', data.data);
    console.log('Count:', data.data.length);
  })
```

**Expected output:**
```json
{
  "success": true,
  "data": [
    {"id": 1, "username": "admin", "role": "admin"},
    {"id": 2, "username": "testuser", "role": "user"}
  ]
}
```

---

### Test 4: Test Form Elements
```javascript
// Check form elements exist
console.log('Username field:', document.getElementById('new_username'));
console.log('Password field:', document.getElementById('new_password'));
console.log('Role select:', document.getElementById('assign_role'));

// Try getting values
console.log('Current values:');
console.log('  Username:', document.getElementById('new_username').value);
console.log('  Password:', document.getElementById('new_password').value);
console.log('  Role:', document.getElementById('assign_role').value);
```

---

## Common Database Issues

### Issue: Users table doesn't exist
**Check:**
```sql
-- Show all tables
SHOW TABLES;

-- If users table missing, create it:
CREATE TABLE users (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user', 'supervisor') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Issue: Cannot insert new user - "Duplicate entry"
**Cause:** Username already exists  
**Solution:**
```sql
-- Check existing users
SELECT * FROM users;

-- Delete if needed
DELETE FROM users WHERE username = 'testuser';

-- Then try creating again
```

---

### Issue: Cannot insert new user - "Access denied"
**Cause:** MySQL user permissions  
**Solution:**
```sql
-- Check current privileges
SHOW GRANTS FOR 'root'@'localhost';

-- Grant all privileges to user
GRANT ALL PRIVILEGES ON stores.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

---

## Performance Issues

### Issue: Creating user is slow (> 5 seconds)
**Check:**
1. Network latency
   - Check Network tab (F12 > Network)
   - Look at request time

2. Database load
   - Check MySQL CPU usage
   - Look for slow queries in MySQL logs

3. Server resources
   - Check XAMPP CPU/Memory usage

**Solution:**
- Restart XAMPP
- Close unnecessary browser tabs
- Check for other processes using CPU

---

## Security Verification

### Verify Admin-Only Access
```javascript
// This should fail for non-admin users
fetch('../backend/create_user.php', {
  method: 'POST',
  body: new URLSearchParams({username: 'test', password: 'test', role: 'user'})
})
.then(r => r.text())
.then(result => console.log(result))

// Expected: "error: unauthorized - only admins can create users"
```

---

### Verify Password Hashing
```sql
-- Passwords should NOT be plaintext
SELECT username, password FROM users;

-- Should see: $2y$10$... (bcrypt hash)
-- Should NOT see: plain password
```

---

### Verify SQL Injection Prevention
```javascript
// Try SQL injection username (should fail gracefully)
fetch('../backend/create_user.php', {
  method: 'POST',
  body: new URLSearchParams({
    username: "admin' OR '1'='1",
    password: 'test',
    role: 'user'
  })
})
.then(r => r.text())
.then(result => console.log(result))

// Should reject or safely handle the input
```

---

## Getting Help

### Information to provide when reporting issues:
1. Error message (exactly as shown)
2. Browser console output (F12 > Console)
3. Network request details (F12 > Network)
4. MySQL error log if applicable
5. Steps to reproduce

### Files to check:
1. `backend/create_user.php` - Creation logic
2. `frontend/dashboard_users.js` - Form handling
3. `backend/check_auth.php` - Authentication
4. `backend/db.php` - Database connection

### Logs to check:
1. Browser console (F12 > Console)
2. XAMPP error log
3. MySQL error log
4. PHP error log

