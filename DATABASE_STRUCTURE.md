# Warehouse Management System - Database Structure & API Documentation

## 📊 Database Tables (6 Tables)

### 1. **header_infor** - Work Order Headers
```sql
Columns:
- id (INT, Primary Key)
- customer_name (VARCHAR)
- work_order (VARCHAR, Unique)
- mrn_no (VARCHAR)
- cut_qty (INT)
- location (VARCHAR)
- work_date (DATE)
- status (VARCHAR: 'created', 'received', 'pending', 'done')
- created_at (TIMESTAMP)
```
**Purpose:** Stores main work order information
**Relations:** 1 header → many products (product_information.work_order)

---

### 2. **product_information** - Products within Work Orders
```sql
Columns:
- id (INT, Primary Key)
- work_order (VARCHAR, Foreign Key → header_infor.work_order)
- item_code (VARCHAR)
- item (VARCHAR)
- colour (VARCHAR)
- size (VARCHAR)
- unit (VARCHAR)
- mr_qty (INT) - MR Quantity (target quantity)
- ignored (TINYINT, default 0)
- created_at (TIMESTAMP)
```
**Purpose:** Stores product details for each work order
**Relations:** 
  - many products → 1 work order
  - 1 product → many receiving records
  - 1 product → many issuing records

---

### 3. **receivings** - Incoming Stock Records
```sql
Columns:
- id (INT, Primary Key)
- product_id (INT, Foreign Key → product_information.id)
- qty (INT) - Received quantity
- date (DATE)
- note (VARCHAR)
- created_at (TIMESTAMP)
```
**Purpose:** Tracks all incoming stock for products
**Key Field:** qty (quantity received, not received_qty)
**Relations:** many receivings → 1 product

---

### 4. **issues** - Outgoing Stock Records
```sql
Columns:
- id (INT, Primary Key)
- product_id (INT, Foreign Key → product_information.id)
- qty (INT) - Issued quantity
- date (DATE)
- note (VARCHAR)
- created_at (TIMESTAMP)
```
**Purpose:** Tracks all outgoing stock for products
**Key Field:** qty (quantity issued, not issued_qty)
**Relations:** many issues → 1 product

---

### 5. **master_data** - Dropdown Data
```sql
Columns:
- id (INT, Primary Key)
- type (VARCHAR: 'customer', 'item', 'size')
- value (VARCHAR)
- created_at (TIMESTAMP)
```
**Purpose:** Stores all dropdown values
**Types:** 
  - 'customer' - Customer names
  - 'item' - Item names
  - 'size' - Product sizes

---

### 6. **users** - User Authentication
```sql
Columns:
- id (INT, Primary Key)
- username (VARCHAR, Unique)
- password (VARCHAR - hashed)
- role (VARCHAR: 'admin', 'user')
- created_at (TIMESTAMP)
```
**Purpose:** User accounts and authentication
**Roles:**
  - 'admin' - Full access to all features
  - 'user' - Limited access (no Master Data, no Users management)

---

## 🔄 Data Flow & API Endpoints

### Work Order Management

#### Create Work Order
- **File:** `backend/add_work.php`
- **Method:** POST
- **Parameters:**
  - customer_name, work_order, mrn_no, cut_qty
  - location, work_date, status
  - item_code, item, colour, size, unit, mr_qty (optional)
- **Database:** Inserts to header_infor + product_information
- **Response:** "added" or error message

#### Get All Work Orders
- **File:** `backend/get_work.php`
- **Method:** GET
- **Query Params:** work_order (optional), range (7days|30days|today)
- **Database Joins:**
  - header_infor → product_information
  - product_information → receivings (SUM qty)
  - product_information → issues (SUM qty)
- **Response:** JSON array with total_received and total_issued

#### Get Work Orders with Shortage
- **File:** `backend/get_work_with_shortage.php`
- **Method:** GET
- **Database:** Same as get_work.php + shortage calculation
- **Shortage Formula:** (total_received + total_issued) < mr_qty
- **Response:** JSON with shortage and hasShortage flags

#### Update Work Order
- **File:** `backend/update_work.php`
- **Method:** POST
- **Parameters:** id, customer_name, mrn_no, cut_qty, location, work_date, status, item_code, item, colour, size, unit, mr_qty
- **Protection:** work_order field is READ-ONLY and protected
- **Response:** "updated" or error message

#### Delete Work Order
- **File:** `backend/delete_work.php`
- **Method:** GET
- **Query Params:** id
- **Cascade:** Deletes all products and their receiving/issuing records
- **Response:** "deleted" or error message

---

### Product Management

#### Add Product to Work Order
- **File:** `backend/add_product.php`
- **Method:** POST
- **Parameters:** work_order, item_code, item, colour, size, unit, mr_qty
- **Validation:** Checks for duplicate products in same work order
- **Response:** JSON with product_id

#### Update Product
- **File:** `backend/update_product.php`
- **Method:** POST
- **Parameters:** id, item_code, item, colour, size, unit, mr_qty
- **Response:** JSON success message

#### Delete Product
- **File:** `backend/delete_product.php`
- **Method:** POST
- **Parameters:** id
- **Cascade:** Deletes associated receiving/issuing records
- **Response:** JSON success message

#### Add Multiple Products
- **File:** `backend/add_multiple_products.php`
- **Method:** POST
- **Parameters:** work_order, products (JSON array)
- **Response:** JSON with results array

---

### Receiving & Issuing

#### Add Receiving Record
- **File:** `backend/add_receiving.php`
- **Method:** POST
- **Parameters:** work_order, product_id, received_qty, received_date, received_notes, force
- **Logic:**
  - Check if total_received + qty >= mr_qty
  - If yes and force=false: Return MR_FULFILLED warning
  - If force=true: Proceed despite reaching MR limit
  - Auto-update work order status
- **Status Update Logic:**
  - created → received (when some received qty added)
  - received → pending (when some issued qty added)
  - pending → done (when issued >= received balance achieved)
- **Response:** JSON with new_total_received

#### Add Issuing Record
- **File:** `backend/add_issuing.php`
- **Method:** POST
- **Parameters:** work_order, product_id, issued_qty, issued_date, issued_notes, force
- **Logic:**
  - Check if total_issued + qty > total_received
  - If yes and force=false: Return SHORTAGE_WARNING
  - If force=true: Proceed despite shortage
  - Auto-update work order status
- **Response:** JSON with new_total_issued

#### Get Receiving/Issuing History
- **File:** `backend/get_receiving_issuing.php`
- **Method:** GET
- **Query Params:** product_id
- **Database:** JSON from receivings and issues tables
- **Aliases:** qty → received_qty/issued_qty for frontend
- **Response:** JSON with receivings and issuings arrays

---

### Master Data Management

#### Get Master Data
- **File:** `backend/get_master_data.php`
- **Method:** GET
- **Query Params:** type (customer|item|size)
- **Database:** Queries master_data table
- **Response:** JSON array of values

#### Add Master Data (Admin Only)
- **File:** `backend/add_master_data.php`
- **Method:** POST
- **Parameters:** type (customer|item|size), value
- **Auth Check:** Admin only
- **Response:** "added" or error

#### Delete Master Data (Admin Only)
- **File:** `backend/delete_master_data.php`
- **Method:** GET
- **Query Params:** type (customer|item|size), value
- **Auth Check:** Admin only
- **Response:** "deleted" or error

#### Get Customers (Shortcut)
- **File:** `backend/get_customers.php`
- **Method:** GET
- **Database:** Queries master_data WHERE type='customer'
- **Response:** JSON array of customer names

#### Get Autocomplete Data
- **File:** `backend/get_autocomplete.php`
- **Method:** GET
- **Query Params:** action (optional)
- **Sources:**
  - master_data (customers, items, sizes)
  - product_information (distinct colours, item_codes)
- **Response:** JSON with all autocomplete values

---

### User Management (Admin Only)

#### Create User
- **File:** `backend/create_user.php`
- **Method:** POST
- **Parameters:** username, password, role (admin|user)
- **Auth Check:** Admin only
- **Security:** Password hashed with PASSWORD_DEFAULT
- **Response:** "added" or error

#### Get All Users
- **File:** `backend/get_users.php`
- **Method:** GET
- **Auth Check:** Admin only
- **Database:** Queries users table (excludes passwords)
- **Response:** JSON array of users

#### Delete User
- **File:** `backend/delete_user.php`
- **Method:** POST
- **Parameters:** id, username
- **Auth Check:** Admin only, cannot delete self
- **Response:** "deleted" or error

---

### Authentication

#### Login
- **File:** `backend/login.php`
- **Method:** POST
- **Parameters:** username, password
- **Security:** password_verify() with PASSWORD_DEFAULT
- **Response:** JSON with user data or error

#### Check Auth
- **File:** `backend/check_auth.php`
- **Method:** GET
- **Response:** JSON with user data or "not_logged_in"

#### Logout
- **File:** `backend/logout.php`
- **Method:** GET
- **Response:** Clears session, redirects to login

---

### Charts & Analytics

#### Get Chart Data
- **File:** `backend/get_chart_data.php`
- **Method:** GET
- **Query Params:** range (today|7days|30days)
- **Database:** Counts by work_date + status
- **Response:** JSON array with dates, pending count, done count

---

## ⚙️ Key Business Logic

### Status Lifecycle
```
1. created
   ↓ (Receiving added)
2. received
   ↓ (Issuing added)
3. pending (more to issue)
   ↓ (All issued or shortage created)
4. done
```

### Shortage Calculation
```
Available Stock = total_received - total_issued
Shortage Amount = (issued_qty - available_stock)
Status: WARNING if issued > received, but ALLOW on force=true
```

### MR Quantity Logic
```
When total_received >= mr_qty:
- Status: INFO (not error)
- Message: "reach/exceed MR Qty"
- Allow: YES with force=true confirmation
- Used to identify when MR qty is fulfilled
```

### Work Order Field Protection
```
- Field: work_order (in header_infor)
- Edit UI: Read-only, disabled in form
- Backend: Not accepted in update query parameters
- Reason: Primary identifier for all relationships
```

---

## 🔐 Security Features

1. **Password Security:** PASSWORD_DEFAULT hashing
2. **Role-Based Access:** admin vs user restrictions
3. **SQL Injection Prevention:** Prepared statements with bind_param
4. **Input Validation:** Type casting for numeric fields
5. **Session Management:** check_auth.php for all protected endpoints
6. **Cascading Deletes:** Foreign keys prevent orphaned records

---

## ✅ Verification Checklist

- [x] All 6 tables exist in database
- [x] All PHP files use correct table names
- [x] All Foreign Key relationships configured
- [x] receiving_log/issuing_log replaced with receivings/issues
- [x] received_qty/issued_qty field names corrected to qty
- [x] GET queries return correct column names via aliases
- [x] Status auto-updates on receiving/issuing operations
- [x] Work order number protected from editing
- [x] Master data segregation by type
- [x] User roles enforced throughout system

---

## 🚀 System Status: FULLY FUNCTIONAL ✅

All database connections are aligned with the 6-table structure.
All APIs are connected and operational.
Ready for production use.
