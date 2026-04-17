# System Architecture - Quick Reference

## 📋 6-Table Database Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                         │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  master_data     │  (Dropdowns)
    │  - customer      │
    │  - item          │
    │  - size          │
    └──────────────────┘
           │
           │
    ┌──────────────────────┐
    │   header_infor       │  (Work Order Headers)
    │  (work_order PK)     │
    └──────────────────────┘
           │
           │ 1-to-Many
           │
    ┌──────────────────────┐
    │product_information   │  (Products)
    │(work_order FK)       │
    └──────────────────────┘
           │
      ┌────┴────┐
      │          │
      │1-to-Many │1-to-Many
      │          │
    ┌─────────┐  ┌────────┐
    │receivings│  │ issues │  (Incoming/Outgoing)
    │(product  │  │(product│
    │ id FK)   │  │ id FK) │
    └─────────┘  └────────┘

    ┌──────────────┐
    │    users     │  (Authentication)
    │  (role-based)│
    └──────────────┘
```

---

## 🔄 Complete Data Flow

### 1️⃣ CREATE WORK ORDER
```
Dashboard → dashboard_app.js:addWork()
    ↓
POST /backend/add_work.php
    ↓
INSERT INTO header_infor (customer_name, work_order, status...)
INSERT INTO product_information (work_order, item_code, colour...)
    ↓
Response: "added"
```

### 2️⃣ VIEW WORK ORDERS
```
Dashboard → dashboard_app.js:loadTable()
    ↓
GET /backend/get_work.php?range=7days
    ↓
SELECT FROM header_infor h
LEFT JOIN product_information p
LEFT JOIN (SELECT SUM(qty) FROM receivings)
LEFT JOIN (SELECT SUM(qty) FROM issues)
    ↓
Response: JSON with all work orders + totals
```

### 3️⃣ ADD RECEIVING
```
Receiving/Issuing Tab → receiving_issuing.js:addReceivingRecord()
    ↓
POST /backend/add_receiving.php
    ↓
CHECK: total_received + qty >= mr_qty?
    ├─ YES: Return MR_FULFILLED | force=false → warn user
    └─ NO or force=true → INSERT INTO receivings
    ↓
UPDATE header_infor SET status = 'received'
    ↓
Response: JSON with new_total_received
```

### 4️⃣ ADD ISSUING
```
Receiving/Issuing Tab → receiving_issuing.js:addIssuingRecord()
    ↓
POST /backend/add_issuing.php
    ↓
CHECK: total_issued + qty > total_received?
    ├─ YES: Return SHORTAGE_WARNING | force=false → warn user
    └─ NO or force=true → INSERT INTO issues
    ↓
UPDATE header_infor SET status = 'pending' or 'done'
    ↓
Response: JSON with new_total_issued
```

### 5️⃣ UPDATE WORK ORDER (Edit Section)
```
Edit Tab → dashboard_app.js:updateWork()
    ↓
Search → searchEditWorkOrders() → display matching orders
Select → prepareEdit() → populate form (work_order READ-ONLY)
Edit → updateWork() → POST /backend/update_work.php
    ↓
UPDATE header_infor (all fields EXCEPT work_order)
UPDATE product_information (product details)
    ↓
Response: "updated"
```

---

## 🗂️ Backend File Organization

### Core Operations
- `add_work.php` - Create work orders
- `update_work.php` - Edit work orders (protected work_order field)
- `delete_work.php` - Delete work orders with cascade

### Products
- `add_product.php` - Add product to work order
- `update_product.php` - Update product details
- `delete_product.php` - Delete product
- `add_multiple_products.php` - Bulk product import

### Receiving & Issuing
- `add_receiving.php` - Record incoming stock + auto-status update
- `add_issuing.php` - Record outgoing stock + auto-status update
- `get_receiving_issuing.php` - Display receiving/issuing history

### Master Data
- `get_master_data.php` - Get dropdown values
- `add_master_data.php` - Add new dropdown value (admin)
- `delete_master_data.php` - Delete dropdown value (admin)
- `get_customers.php` - Shortcut for customer list
- `get_autocomplete.php` - All autocomplete values

### Users
- `create_user.php` - Create user (admin)
- `get_users.php` - List all users (admin)
- `delete_user.php` - Delete user (admin)

### Authentication
- `login.php` - User login with password verification
- `check_auth.php` - Check session + return user info
- `logout.php` - Clear session

### Data Retrieval
- `get_work.php` - Main work order query (WITH receivings + issues)
- `get_work_with_shortage.php` - Work orders with shortage calculation
- `get_chart_data.php` - Status trends for dashboard
- `get_receiving_issuing.php` - Product history

### Utilities
- `db.php` - Database connection
- `backup_db.php` - Database backups

---

## 🎯 Fixed Database Issues (April 7, 2026)

### ❌ BEFORE:
- `get_work.php` used `receiving_log` table (doesn't exist)
- `get_work.php` used `issuing_log` table (doesn't exist)
- `get_work.php` tried to access `received_qty` field (wrong name)
- `get_work.php` tried to access `issued_qty` field (wrong name)

### ✅ AFTER:
```php
// Lines 57-63 corrected:
LEFT JOIN (
    SELECT product_id, SUM(qty) as total_received
    FROM receivings                          // ← Correct table
    GROUP BY product_id
) r ON r.product_id = p.id
LEFT JOIN (
    SELECT product_id, SUM(qty) as total_issued 
    FROM issues                              // ← Correct table
    GROUP BY product_id
) i ON i.product_id = p.id
```

---

## 🔐 Protection Mechanisms

### Work Order Number (Read-Only)
```
HTML: <input readonly>
JS: Not sent in updateWork() parameters
PHP: Not accepted in update_work.php
Reason: Foreign key used by product_information, receivings, issues
```

### Admin-Only Features
```
Master Data Management (add/delete)
User Management (create/delete)
Session check: $_SESSION['role'] !== 'admin' → deny
```

### Password Security
```
Creation: PASSWORD_DEFAULT hashing
Login: password_verify() check
Never stored in plain text
```

### SQL Injection Prevention
```
All queries use prepared statements
bind_param() with type specifiers (i=int, s=string)
No string concatenation in queries
```

---

## 🧪 Verification Tests

### Test 1: Create & View Work Order
```
✓ Add work order → Appears in list
✓ Add receiving → total_received increases
✓ Add issuing → total_issued increases
✓ Status auto-updates (created → received → pending → done)
```

### Test 2: Receiving Workflow
```
✓ Can add receiving up to MR qty
✓ At MR_qty boundary → Shows info message
✓ force=true → Allows continue despite fulfillment
✓ total_received calculation correct
```

### Test 3: Issuing Workflow
```
✓ Can only issue up to total_received
✓ Exceeding received → Shows shortage warning
✓ force=true → Allows continue despite shortage
✓ Shortage amount calculated correctly
```

### Test 4: Edit Operations
```
✓ Search finds work orders by all fields
✓ Work order field displays as read-only
✓ Can edit all other fields
✓ Changes save correctly
```

### Test 5: Master Data
```
✓ Dropdown lists populated from master_data
✓ New values saved to master_data
✓ Values removed when deleted (admin only)
✓ Autocomplete works for all fields
```

### Test 6: User Management
```
✓ Admin can create users
✓ Can view all users (admin)
✓ Can delete users (admin, not self)
✓ Admin/user role restrictions enforced
```

---

## 🚀 System Status

```
✅ Database: All 6 tables configured
✅ Tables: receiving_log → receivings, issuing_log → issues
✅ Fields: received_qty → qty, issued_qty → qty
✅ Queries: All using correct table names
✅ Logic: Receiving/Issuing with warnings + force override
✅ Protection: Work order number read-only
✅ Roles: Admin/User access control
✅ Security: Password hashing, SQL injection protection
✅ Encryption: Ready for production
```

---

**Last Updated:** April 7, 2026
**Status:** FULLY OPERATIONAL ✅
