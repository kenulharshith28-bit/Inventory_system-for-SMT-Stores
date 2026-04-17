# PHP Files Guide - Stores Management System

Complete explanation of what each PHP file does and handles.

---

## 🔌 CORE / FOUNDATION FILES

### 1. **db.php** - Database Connection
**Purpose:** Establishes MySQL database connection
**Handles:**
- Connection to `stores` database
- Uses MySQLi extension (secure, prepared statements)
- Server: `localhost`, Username: `root`, Password: (empty)
- Included in all backend scripts that need database access
- Terminates with error if connection fails
**Called By:** Every other PHP file that needs database access
**Security:** ✅ Database credentials centralized

---

### 2. **check_auth.php** - Session Authentication Check
**Purpose:** Verifies if user is logged in (used by frontend on page load)
**Handles:**
- Checks `$_SESSION['user']` existence
- Returns JSON response with session status
- Returns user information + role if logged in
- Returns "not_logged_in" if session expired
**Endpoint Format:** `GET ../backend/check_auth.php`
**Response Example:**
```json
{
    "status": "logged_in",
    "user": "admin_user",
    "role": "admin"
}
```
**Security:** ✅ Session-based, no parameters needed

---

## 🔐 AUTHENTICATION FILES

### 3. **login.php** - User Login
**Purpose:** Authenticates user credentials
**Handles:**
- Receives `username` and `password` from login form
- Queries `users` table
- Verifies password with bcrypt (`password_verify()`)
- Creates PHP session if credentials correct
- Stores: `$_SESSION['user']`, `$_SESSION['role']`, `$_SESSION['user_id']`
- Returns success/error message
**Endpoint Format:** `POST ../backend/login.php`
**Parameters:**
- `username` (string, required)
- `password` (string, required)
**Response:** "ok" or error message
**Security:** ✅ Bcrypt password hashing, prepared statements

### 4. **logout.php** - User Logout
**Purpose:** Ends user session and performs backup
**Handles:**
- Calls `performDatabaseBackup()` to backup database before logout
- Destroys session
- Clears all session data
- Returns "logged_out" message
**Endpoint Format:** `GET ../backend/logout.php`
**Security:** ✅ Session destruction, backup preservation

### 5. **register.php** - Public Registration (DISABLED)
**Purpose:** Was for public user registration
**Status:** ❌ DISABLED (admin-only user creation now enforced)
**Note:** Use `create_user.php` instead for admin-controlled user creation

---

## 👥 USER MANAGEMENT FILES

### 6. **create_user.php** - Admin-Only User Creation
**Purpose:** Create new user accounts (admin only)
**Handles:**
- ✅ Verifies user is authenticated admin
- Validates username (3-50 characters, alphanumeric + underscore)
- Validates role (whitelist: admin, user, supervisor)
- Prevents duplicate usernames
- Hashes password with bcrypt (cost factor: 10)
- Returns HTTP status codes (201 Created, 403 Forbidden, 500 Error)
- Returns detailed error messages for debugging
**Endpoint Format:** `POST ../backend/create_user.php`
**Parameters:**
- `username` (string, 3-50 chars)
- `password` (string, required)
- `role` (string: 'admin', 'user', 'supervisor')
**Response:** JSON with success/error details
**Security:** ✅ Admin verification, input validation, bcrypt hashing, prepared statements

### 7. **get_users.php** - Get User List
**Purpose:** Retrieve all users for admin dashboard
**Handles:**
- Queries `users` table
- Returns all users with id, username, role
- Excludes passwords from response
- Returns JSON array
**Endpoint Format:** `GET ../backend/get_users.php`
**Response Example:**
```json
[
    {"id": 1, "username": "admin", "role": "admin"},
    {"id": 2, "username": "operator", "role": "user"}
]
```
**Security:** ✅ No sensitive data exposed

### 8. **delete_user.php** - Delete User Account
**Purpose:** Remove user from system (admin only)
**Handles:**
- Verifies admin session
- Deletes user from `users` table by ID
- Prevents self-deletion
**Endpoint Format:** `GET ../backend/delete_user.php?id={user_id}`
**Parameters:** `id` (integer, user ID)
**Security:** ✅ Admin verification

---

## 📦 WORK ORDER MANAGEMENT FILES

### 9. **add_work.php** - Create Work Order
**Purpose:** Create new work order with optional initial product
**Handles:**
- Validates required fields: customer_name, work_order
- Sets default work_date to today if not provided
- Sets default status to "created"
- Uses transactions for consistency
- Inserts into `header_infor` table
- Optionally adds first product if provided
- Returns inserted work order ID or error
**Endpoint Format:** `POST ../backend/add_work.php`
**Parameters:**
- `customer_name` (required)
- `work_order` (required, unique identifier)
- `mrn_no` (MRN number)
- `cut_qty` (quantity to cut)
- `location` (storage location)
- `work_date` (date, defaults to today)
- `item_code`, `item`, `colour`, `size`, `mr_qty` (optional product fields)
**Response:** JSON with success/error
**Security:** ✅ Transactions, prepared statements

### 10. **update_work.php** - Update Work Order
**Purpose:** Modify existing work order details
**Handles:**
- Updates `header_infor` table
- Can update customer_name, status, work_date, etc.
- Uses transactions for data consistency
- Allows partial updates
**Endpoint Format:** `POST ../backend/update_work.php`
**Parameters:** `id` + any fields to update
**Security:** ✅ Transactions, prepared statements

### 11. **delete_work.php** - Delete Work Order
**Purpose:** Remove entire work order and associated products
**Handles:**
- Cascading delete (deletes work order + all products + all receiving/issuing records)
- Uses transactions to ensure all-or-nothing operation
- Gets work order number first
- Deletes from product_information, then header_infor
- Returns success/error
**Endpoint Format:** `GET ../backend/delete_work.php?id={work_order_id}`
**Parameters:** `id` (work order header ID)
**Security:** ✅ Cascading delete with transactions

### 12. **get_work.php** - Get Work Orders
**Purpose:** Retrieve work orders with complete details and receiving/issuing aggregation
**Handles:**
- Supports filtering by:
  - Specific work order ID
  - Time range (today, 7days, 30days)
- Complex JOIN with:
  - `header_infor` (work order header)
  - `product_information` (products in work order)
  - `receivings` aggregated (total received per product)
  - `issues` aggregated (total issued per product)
- Calculates: total_received, total_issued
- Returns all work order data for dashboard display
- Also handles `getAllColours` action for autocomplete
**Endpoint Format:** `GET ../backend/get_work.php?range=7days`
**Parameters:**
- `work_order` (optional, specific work order)
- `range` (optional: today, 7days, 30days)
- `action=getAllColours` (for autocomplete)
**Response:** JSON array of work orders with full details
**Security:** ✅ Prepared statements

---

## 📦 PRODUCT MANAGEMENT FILES

### 13. **add_product.php** - Add Product to Work Order
**Purpose:** Add new product to existing work order
**Handles:**
- Validates work order exists
- Prevents duplicate products (same item_code, colour, size, unit, mr_qty)
- Inserts into `product_information` table
- Links to work order via `work_order` field
**Endpoint Format:** `POST ../backend/add_product.php`
**Parameters:**
- `work_order` (required, must exist)
- `item_code` (optional)
- `item` (required)
- `colour`, `size`, `unit`, `mr_qty`
**Security:** ✅ Duplicate prevention, validation

### 14. **add_multiple_products.php** - Bulk Product Addition
**Purpose:** Add multiple products at once (used for importing product lists)
**Handles:**
- Processes array of products
- Validates each product
- Batch inserts efficiency
**Endpoint Format:** `POST ../backend/add_multiple_products.php`

### 15. **update_product.php** - Update Product Details
**Purpose:** Modify existing product information
**Handles:**
- Updates `product_information` table
- Can update item_code, item, colour, size, unit, mr_qty
**Endpoint Format:** `POST ../backend/update_product.php`

### 16. **delete_product.php** - Delete Product
**Purpose:** Remove single product from work order
**Handles:**
- Deletes from `product_information` by product ID
- Does NOT delete receiving/issuing records (data preservation)
**Endpoint Format:** `GET ../backend/delete_product.php?id={product_id}`

---

## 📥 RECEIVING MANAGEMENT FILES

### 17. **add_receiving.php** - Register Incoming Stock
**Purpose:** Record when products are received
**Handles:**
- Validates product exists and quantity valid (> 0)
- Gets current totals for this product
- Checks if received qty + new qty would exceed mr_qty
- If exceeds: returns "MR_FULFILLED" warning → user can force override
- Inserts into `receivings` table (qty, date, note columns)
- **Calls updateWorkOrderStatus()** to auto-update header_infor status:
  - created → received (if qty received > 0)
  - received → pending (if received == mr_qty)
  - pending → done (if issued == mr_qty)
- Returns success/error/warning
**Endpoint Format:** `POST ../backend/add_receiving.php`
**Parameters:**
- `product_id` (required)
- `received_qty` (required, > 0)
- `received_date` (required)
- `received_notes` (optional)
- `force` (optional, bypass MR_FULFILLED warning)
**Response:** JSON with success/error
**Important:** Column mapping - frontend sends `received_qty`, backend inserts into `qty` column
**Security:** ✅ Validation, status auto-update

### 18. **setup_receiving_issuing.php** - Initialize Receiving/Issuing (Utility)
**Purpose:** Helper file for setting up receiving/issuing workflow
**Status:** Utility file

---

## 📤 ISSUING MANAGEMENT FILES

### 19. **add_issuing.php** - Register Outgoing Stock
**Purpose:** Record when products are issued/used
**Handles:**
- Similar to add_receiving.php
- Validates quantity
- Checks shortage detection
- Inserts into `issues` table
- **Calls updateWorkOrderStatus()** for auto-status updates
- Warning if qty > received (shortage condition)
**Endpoint Format:** `POST ../backend/add_issuing.php`
**Parameters:**
- `product_id` (required)
- `issued_qty` (required)
- `issued_date` (required)
- `issued_notes` (optional)
- `force` (optional)
**Important:** Column mapping - frontend sends `issued_qty`, backend inserts into `qty` column
**Security:** ✅ Shortage detection, validation

### 20. **ignore_shortage.php** - Override Shortage Flag
**Purpose:** Manually ignore shortage warnings for specific products
**Handles:**
- Marks product as ignored in `ignored` column
- Prevents shortage warnings for that product
**Endpoint Format:** `POST ../backend/ignore_shortage.php`

### 21. **get_receiving_issuing.php** - Get Stock History
**Purpose:** Retrieve complete receiving/issuing history for product
**Handles:**
- Queries receiving and issuing records
- Uses SELECT aliases: `qty as received_qty`, `date as received_date`
- Calculates:
  - Total received
  - Total issued
  - Balance (received - issued)
  - Shortage (max(0, mr_qty - received))
- Returns complete stock history
**Endpoint Format:** `GET ../backend/get_receiving_issuing.php?product_id={id}`
**Response:** JSON with receiving array, issuing array, calculations
**Important:** Aliases handle frontend naming convention

### 22. **get_work_with_shortage.php** - Shortage Detection Report
**Purpose:** Find products with shortage (received < mr_qty)
**Handles:**
- Complex JOIN and aggregation
- CASE statements to calculate shortages
- Returns only products with shortage
- Used for shortage alerts
**Endpoint Format:** `GET ../backend/get_work_with_shortage.php`
**Response:** Array of products with shortage data

---

## 📊 REPORTING / DASHBOARD FILES

### 23. **get_chart_data.php** - Chart Data for Trends
**Purpose:** Generate data for Work Order Trends line chart
**Handles:**
- Groups work orders by date and status
- Categorizes statuses: open, pending, done
- Supports time ranges: today, 7days, 30days
- Returns date + count for each status
- Generates data points for all days in range (fills missing days with 0)
**Endpoint Format:** `GET ../backend/get_chart_data.php?range=7days`
**Response Example:**
```json
[
    {"date": "2026-04-01", "open": 5, "pending": 2, "done": 3},
    {"date": "2026-04-02", "open": 4, "pending": 1, "done": 2}
]
```
**Used By:** Dashboard trends chart (line chart with 3 lines)

### 24. **get_customers.php** - Get Customer List
**Purpose:** Retrieve all unique customers for dropdowns
**Handles:**
- Queries `master_data` table
- Filters by type='customer'
- Returns array of customer names
**Endpoint Format:** `GET ../backend/get_customers.php`
**Response:** JSON array of customer names

### 25. **get_master_data.php** - Get Master Data by Type
**Purpose:** Retrieve dropdown/reference data (customers, items, sizes)
**Handles:**
- Queries `master_data` table
- Filters by type parameter
- Returns list of values
**Endpoint Format:** `GET ../backend/get_master_data.php?type=item`
**Parameters:** `type` (customer|item|size)
**Response:** JSON array of values

### 26. **get_master_data_table.php** - Get Master Data for Admin Table
**Purpose:** Return all master data for admin editing/management
**Handles:**
- Returns complete master_data table
- Includes id, type, value for each row
**Endpoint Format:** `GET ../backend/get_master_data_table.php`
**Response:** JSON array with all master data records

### 27. **add_master_data.php** - Add Dropdown Option
**Purpose:** Add new customer/item/size to master data
**Handles:**
- Inserts into `master_data` table
- Parameters: type, value
**Endpoint Format:** `POST ../backend/add_master_data.php`
**Parameters:**
- `type` (customer|item|size)
- `value` (the actual value to add)

### 28. **delete_master_data.php** - Delete Dropdown Option
**Purpose:** Remove customer/item/size from master data
**Handles:**
- Deletes from `master_data` by ID
**Endpoint Format:** `GET ../backend/delete_master_data.php?id={id}`

### 29. **get_autocomplete.php** - Autocomplete Suggestions
**Purpose:** Provide suggestions while typing (for search/filter)
**Handles:**
- Searches `master_data` for matching values
- Used in product search, item selection
- Returns matching results
**Endpoint Format:** `GET ../backend/get_autocomplete.php?query=xxx&type=item`

---

## 💾 BACKUP / RESTORATION FILES

### 30. **backup_db.php** - Performs Database Backup
**Purpose:** Execute database backup
**Handles:**
- Uses `mysqldump` system command
- Creates SQL backup file
- Saves to `backups/` folder
- Format: `stores_backup_YYYY-MM-DD_HHMMSS.sql`
- Called by logout.php and backup_automation.php
**Exports:** Complete database structure + data

### 31. **backup_automation.php** - Hourly Backup Automation
**Purpose:** Automated hourly backups with retention policy
**Handles:**
- Stores database backup
- Keeps maximum 48 backups
- Deletes oldest backup when total exceeds 48
- Logs backup activity to `backup.log`
- Called by Windows Task Scheduler
- Safe deletion: only deletes after new backup succeeds
**Features:**
- Error logging
- Activity timestamps
- Automatic cleanup
**Schedule:** Every 1 hour via Task Scheduler

### 32. **backup_monitor.html** - Backup Monitoring Dashboard
**Purpose:** View backup history and status
**Handles:**
- Displays all backups in `/backups/` folder
- Shows backup file sizes and creation times
- Monitor automation status

### 33. **restore_backup.php** - Database Restore from Backup
**Purpose:** Restore database from backup file
**Handles:**
- Two restore modes:
  1. **new_db** - Create new database (safe, no data loss)
  2. **current_db** - Overwrite current database (with auto-safety backup first)
- Admin-only access
- Creates pre-restore safety backup automatically
- Returns restoration status
- Logs all restore operations
**Endpoint Format:** `POST ../backend/restore_backup.php`
**Parameters:**
- `backup_file` (filename from backups folder)
- `mode` (new_db or current_db)
**Response:** JSON with success/error

### 34. **backup_restore_manager.html** - Restore Dashboard
**Purpose:** Professional UI for backup restoration
**Handles:**
- List all available backups
- Select backup to restore
- Choose restore mode
- Confirm restoration
- View restore history

### 35. **backup_scheduler.php** - Cron Wrapper
**Purpose:** Entry point for scheduler tasks
**Handles:**
- Wrapper for running backup_automation.php via cron/scheduler

### 36. **batch_backup_scheduler.bat** - Windows Task Scheduler Script
**Purpose:** Windows batch file for Task Scheduler integration
**Handles:**
- Calls PHP hourly backup script
- Runs on schedule defined in Task Scheduler
- Logs execution

---

## 🧪 TESTING / DEBUG FILES

### 37. **test_add_multiple_products.php** - Test Bulk Products
**Purpose:** Testing file for bulk product addition
**Status:** Development/testing only

### 38. **debug_db.php** - Database Debug Utility
**Purpose:** Test database connections and queries
**Status:** Development/testing only

---

## 📋 DOCUMENTATION FILES (Not PHP Code)

### 39. **DATABASE_STRUCTURE.md** - Schema documentation
### 40. **QUICK_START.md** - Quick start guide
### 41. **BACKUP_SETUP_GUIDE.md** - Backup setup instructions
### 42. **REFERENCE_CARD.md** - Quick reference guide

---

## 📊 STATUS WORKFLOW (Auto-Managed)

When receiving/issuing records are added, status automatically updates:

```
CREATED (initial)
    ↓ (add receiving)
RECEIVED (qty > 0 received)
    ↓ (received qty == mr_qty)
PENDING (ready for issues)
    ↓ (issue qty == mr_qty)
DONE (work order complete)
```

This happens via `updateWorkOrderStatus()` function called by add_receiving.php and add_issuing.php.

---

## 🔒 SECURITY FEATURES IMPLEMENTED

✅ **All Database Files Use:**
- Prepared statements (prevents SQL injection)
- Parameter binding
- Input validation
- Session verification
- Role-based access control

✅ **Authentication Protected:**
- check_auth.php (session check)
- Admin operations verified
- Bcrypt password hashing

✅ **Data Integrity:**
- Transactions for consistency
- Cascading deletes
- Duplicate prevention
- Status auto-update

---

## 📈 API FLOW EXAMPLE

**Creating a Work Order with Product:**

1. User fills form in frontend
2. Submits to `add_work.php` with customer_name, work_order, product details
3. add_work.php:
   - Validates inputs
   - Starts transaction
   - Inserts into header_infor
   - Inserts into product_information
   - Commits transaction
4. Returns success with new IDs
5. Frontend refreshes table via `get_work.php`

**Recording Receiving:**

1. User enters quantity received
2. Submits to `add_receiving.php`
3. add_receiving.php:
   - Validates qty
   - Checks MR fulfillment
   - Inserts into receivings table
   - Calls updateWorkOrderStatus()
   - Status auto-updates in header_infor
4. Frontend refreshes via `get_receiving_issuing.php`

---

## 🎯 SUMMARY

**Total PHP Files:** 38  
**Organized Into:**
- 2 Core files (db, auth)
- 5 Auth files (login, logout, check_auth, create_user, register)
- 4 User management (create_user, get_users, delete_user)
- 4 Work order (add, update, delete, get)
- 4 Product (add, add_multiple, update, delete)
- 6 Receiving/Issuing (add_receiving, add_issuing, ignore_shortage, get, setup, shortage detection)
- 7 Reporting (chart data, customers, master data)
- 6 Backup/Restore (backup, automation, restore, monitoring)
- 2 Testing files

**All secured with prepared statements, validation, transactions, and role-based access control.**

