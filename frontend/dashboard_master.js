/**
 * Stores System - Dashboard Logic
 */

let trendsChart, statusChart, lastData = [];

function normalizeStatus(status) {
    return String(status || "").trim().toLowerCase();
}

function toTitleStatus(status) {
    const value = normalizeStatus(status);
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Created";
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("trendsChart")) {
        const workDate = document.getElementById("work_date");
        if (workDate && !workDate.value) {
            workDate.value = toLocalDateString(new Date());
        }
        initCharts();
        loadMasterData();
        loadMasterDataTable();
        loadTable();
        showSection("home");
    }
});

/**
 * Compatibility alias for loadCustomers
 */
function loadCustomers() {
    loadMasterData();
}

function fetchMasterData(type) {
    console.log(`Fetching master data for type: ${type}`);
    
    return fetch(`../backend/get_master_data.php?type=${encodeURIComponent(type)}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log(`Data fetched for ${type}:`, data);
            
            // Ensure data is an array
            if (!Array.isArray(data)) {
                console.warn(`Data for ${type} is not an array:`, data);
                return [];
            }
            return data;
        })
        .catch(err => {
            console.error(`Error fetching master data (${type}):`, err);
            return [];
        });
}

function loadMasterData(selections = {}) {
    console.log("Loading master data...");
    
    Promise.all([
        fetchMasterData("customer"),
        fetchMasterData("item"),
        fetchMasterData("size")
    ])
        .then(([customers, items, sizes]) => {
            console.log("Master data loaded:", { customers, items, sizes });
            
            // Populate selects in "New" section (may or may not exist)
            if (document.getElementById("name")) {
                populateSelect("name", customers, "Select customer", selections.name || "");
            }
            if (document.getElementById("edit_name")) {
                populateSelect("edit_name", customers, "Select customer", selections.edit_name || "");
            }
            if (document.getElementById("item")) {
                populateSelect("item", items, "Select item", selections.item || "");
            }
            if (document.getElementById("edit_item")) {
                populateSelect("edit_item", items, "Select item", selections.edit_item || "");
            }
            if (document.getElementById("size")) {
                populateSelect("size", sizes, "Select size", selections.size || "");
            }
            if (document.getElementById("edit_size")) {
                populateSelect("edit_size", sizes, "Select size", selections.edit_size || "");
            }

            // Update the master list views (in Master Data section)
            renderMasterList("customerList", customers, "No customers added yet");
            renderMasterList("itemList", items, "No items added yet");
            renderMasterList("sizeList", sizes, "No sizes added yet");
            
            console.log("Master data populated successfully");
        })
        .catch(err => {
            console.error("Master data load error:", err);
            alert(`❌ Error loading master data: ${err.message}`);
        });
}

function populateSelect(selectId, values, placeholder, selectedValue = "") {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`Select element not found: ${selectId}`);
        return;
    }

    try {
        select.innerHTML = `<option value="">${placeholder}</option>`;
        
        // Ensure values is an array
        if (!Array.isArray(values)) {
            console.warn(`Values for ${selectId} is not an array:`, values);
            return;
        }
        
        const optionValues = [...values];
        
        // Add selected value if it's not already in the list
        if (selectedValue && !optionValues.includes(selectedValue)) {
            optionValues.push(selectedValue);
            optionValues.sort((a, b) => a.localeCompare(b));
        }

        optionValues.forEach(value => {
            if (value) { // Skip empty values
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                option.selected = value === selectedValue;
                select.appendChild(option);
            }
        });
        
        console.log(`Select ${selectId} populated with ${optionValues.length} options`);
    } catch (err) {
        console.error(`Error populating select ${selectId}:`, err);
    }
}

function renderMasterList(listId, values, emptyLabel) {
    const list = document.getElementById(listId);
    if (!list) {
        console.error(`List element not found: ${listId}`);
        return;
    }

    list.innerHTML = "";

    if (!values || values.length === 0) {
        list.innerHTML = `<span class="customer-chip empty-state">${emptyLabel}</span>`;
        return;
    }

    const typeMap = {
        customerList: "customer",
        itemList: "item",
        sizeList: "size"
    };
    const type = typeMap[listId];

    values.forEach(value => {
        const chip = document.createElement("span");
        chip.className = "customer-chip";
        
        const deleteBtn = document.createElement("span");
        deleteBtn.className = "chip-delete";
        deleteBtn.dataset.type = type;
        deleteBtn.dataset.value = value;
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.style.cursor = "pointer";
        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            deleteMasterData(this.dataset.type, this.dataset.value);
        };
        
        const textSpan = document.createElement("span");
        textSpan.textContent = value;
        textSpan.style.marginRight = "0.5rem";
        
        chip.appendChild(textSpan);
        chip.appendChild(deleteBtn);
        list.appendChild(chip);
    });
}

function deleteMasterData(type, value) {
    if (!confirm(`Are you sure you want to delete "${value}" from ${type}s?`)) return;

    console.log(`Deleting ${type}: ${value}`);

    const params = new URLSearchParams();
    params.append("type", type);
    params.append("value", value);

    fetch("../backend/delete_master_data.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
        .then(res => res.text())
        .then(data => {
            const response = data.trim();
            console.log(`Delete response: ${response}`);
            
            if (response === "deleted") {
                console.log(`${type} "${value}" deleted successfully`);
                alert(`✓ ${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
                
                // Reload only the master data lists
                reloadMasterDataLists();
            } else {
                console.error(`Delete error response: ${response}`);
                alert(`❌ Error: ${response}`);
            }
        })
        .catch(err => {
            console.error(`Error deleting ${type}:`, err);
            alert(`❌ Failed to delete ${type}. Error: ${err.message}`);
        });
}

function addMasterData(type) {
    const inputMap = {
        customer: "new_customer_option",
        item: "new_item_option",
        size: "new_size_option"
    };
    
    const input = document.getElementById(inputMap[type]);
    
    if (!input) {
        console.error(`Input element not found: ${inputMap[type]}`);
        alert(`❌ Error: Input field not found for ${type}. This is a system error.`);
        return;
    }
    
    const value = input.value.trim();

    if (!value) {
        alert(`⚠ Please enter a ${type} name first.`);
        input.focus();
        return;
    }

    console.log(`Adding ${type}: ${value}`);

    const params = new URLSearchParams();
    params.append("type", type);
    params.append("value", value);

    fetch("../backend/add_master_data.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
        .then(res => res.text())
        .then(data => {
            const response = data.trim();
            console.log(`Add response: ${response}`);
            
            if (response === "added") {
                console.log(`${type} "${value}" added successfully`);
                input.value = "";
                input.focus();
                
                alert(`✓ ${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`);
                
                // Reload only the master data lists
                reloadMasterDataLists();
            } else if (response === "exists") {
                console.log(`${type} "${value}" already exists`);
                alert(`ℹ This ${type} already exists in the database.`);
                input.value = "";
                input.focus();
            } else {
                console.error(`Unexpected response: ${response}`);
                alert(`❌ Error: ${response}`);
            }
        })
        .catch(err => {
            console.error(`Error adding ${type}:`, err);
            alert(`❌ Failed to add ${type}. Error: ${err.message}`);
        });
}

function reloadMasterDataLists() {
    console.log("Reloading master data lists...");
    
    Promise.all([
        fetchMasterData("customer"),
        fetchMasterData("item"),
        fetchMasterData("size")
    ])
        .then(([customers, items, sizes]) => {
            console.log("Master data fetched:", { customers, items, sizes });
            
            // Update the lists in master section
            renderMasterList("customerList", customers, "No customers added yet");
            renderMasterList("itemList", items, "No items added yet");
            renderMasterList("sizeList", sizes, "No sizes added yet");
            
            // Also update dropdowns if they exist (in New Work section)
            populateSelect("name", customers, "Select customer", "");
            populateSelect("edit_name", customers, "Select customer", "");
            populateSelect("item", items, "Select item", "");
            populateSelect("edit_item", items, "Select item", "");
            populateSelect("size", sizes, "Select size", "");
            populateSelect("edit_size", sizes, "Select size", "");
            
            // Reload the master data database table
            loadMasterDataTable();
            
            console.log("Master data lists reloaded successfully");
        })
        .catch(err => {
            console.error("Error reloading master data:", err);
            alert(`❌ Error reloading data: ${err.message}`);
        });
}

function toggleAuth(mode) {
    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");
    if (loginSection && registerSection) {
        loginSection.style.display = mode === "register" ? "none" : "block";
        registerSection.style.display = mode === "register" ? "block" : "none";
    }
}

function socialAlert(feature) {
    if (feature === "Password recovery") {
        const email = prompt("Please enter your registered email address:");
        if (email) {
            alert(`A password reset link has been sent to ${email} (Mock Action).`);
        }
    } else {
        alert(`${feature} is currently under development.`);
    }
}

function login() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (!user || !pass) {
        if (document.getElementById("error")) {
            document.getElementById("error").innerText = "Please fill all fields";
        }
        return;
    }

    const params = new URLSearchParams();
    params.append("username", user);
    params.append("password", pass);

    fetch("../backend/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
        .then(res => res.text())
        .then(data => {
            if (data.trim() === "success") {
                window.location.href = "dashboard.html";
            } else if (document.getElementById("error")) {
                document.getElementById("error").innerText = "Invalid username or password";
            }
        })
        .catch(err => {
            console.error("Login error:", err);
            if (document.getElementById("error")) {
                document.getElementById("error").innerText = "Connection error. Please try again.";
            }
        });
}

function showSection(section) {
    console.log(`Showing section: ${section}`);
    
    // Security check for master section
    if (section === "master" && currentUser && currentUser.role !== 'admin') {
        alert("Access Denied: Admin role required.");
        section = "home";
    }

    // Security check for users section
    if (section === "users" && currentUser && currentUser.role !== 'admin') {
        alert("Access Denied: Admin role required.");
        section = "home";
    }

    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".content-section").forEach(panel => panel.classList.add("content-hidden"));

    if (section === "home") {
        document.getElementById("homeSection").classList.remove("content-hidden");
        document.getElementById("nav-home").classList.add("active");
    } else if (section === "new") {
        document.getElementById("newSection").classList.remove("content-hidden");
        document.getElementById("nav-new").classList.add("active");
    } else if (section === "master") {
        document.getElementById("masterSection").classList.remove("content-hidden");
        document.getElementById("nav-master").classList.add("active");
        // Refresh master data when section is opened
        console.log("Master section opened - loading fresh data and table");
        loadMasterData();
        loadMasterDataTable();
    } else if (section === "edit") {
        document.getElementById("editSection").classList.remove("content-hidden");
        document.getElementById("nav-edit").classList.add("active");
    } else if (section === "receivingIssuing") {
        document.getElementById("receivingIssuingSection").classList.remove("content-hidden");
        document.getElementById("nav-receivingIssuing").classList.add("active");
        if (typeof initializeReceivingIssuing === "function") {
            initializeReceivingIssuing();
        }
    } else if (section === "users") {
        document.getElementById("usersSection").classList.remove("content-hidden");
        document.getElementById("nav-users").classList.add("active");
        // Load users when section is opened
        if (typeof loadUsers === "function") {
            loadUsers();
        }
    }
}

function initCharts() {
    const ctxTrends = document.getElementById("trendsChart").getContext("2d");
    const ctxStatus = document.getElementById("statusChart").getContext("2d");

    trendsChart = new Chart(ctxTrends, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Open",
                data: [],
                borderColor: "#f6c23e",
                backgroundColor: "rgba(246, 194, 62, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: "#f6c23e"
            }, {
                label: "Done",
                data: [],
                borderColor: "#4e73df",
                backgroundColor: "rgba(78, 115, 223, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: "#4e73df"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "top", align: "end", labels: { usePointStyle: true, boxWidth: 6, font: { size: 11 } } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { stepSize: 1, font: { size: 11 } } },
                x: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });

    statusChart = new Chart(ctxStatus, {
        type: "doughnut",
        data: {
            labels: ["Open", "Done"],
            datasets: [{
                data: [0, 0],
                backgroundColor: ["#f6c23e", "#1cc88a"],
                hoverBackgroundColor: ["#f4b619", "#17a673"],
                borderWidth: 0,
                cutout: "80%"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function loadTable() {
    const range = document.getElementById("timeRangeSelect") ? document.getElementById("timeRangeSelect").value : "7days";

    fetch(`../backend/get_work.php?range=${range}`)
        .then(res => res.json())
        .then(data => {
            lastData = data;

            const openCount = data.filter(row => normalizeStatus(row.status) !== "done").length;
            const doneCount = data.filter(row => normalizeStatus(row.status) === "done").length;
            updateStats(data.length, openCount, doneCount);
            statusChart.data.datasets[0].data = [openCount, doneCount];
            statusChart.update();

            renderTable(data);
        });

    fetch(`../backend/get_chart_data.php?range=${range}`)
        .then(res => res.json())
        .then(chartData => {
            updateTrendChart(chartData);
        })
        .catch(err => console.error("Load error:", err));
}

function updateTrendChart(chartData) {
    if (!trendsChart) return;

    trendsChart.data.labels = chartData.map(d => d.date);
    trendsChart.data.datasets[0].data = chartData.map(d => d.pending);
    trendsChart.data.datasets[1].data = chartData.map(d => d.done);
    trendsChart.update();
}

function updateStats(total, open, done) {
    document.getElementById("total").innerText = total;
    document.getElementById("pending").innerText = open;
    document.getElementById("done").innerText = done;

    const percent = total > 0 ? Math.round((open / total) * 100) : 0;
    document.getElementById("pendingPercent").innerText = `${percent}%`;
}

function toLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function renderTable(data) {
    const table = document.getElementById("tableBody");
    table.innerHTML = "";

    if (!data || data.length === 0) {
        table.innerHTML = "<tr><td colspan='7' style='text-align:center; padding: 2rem; color: #a0aec0;'>No work orders found for this period</td></tr>";
        return;
    }

    data.forEach(row => {
        const tr = document.createElement("tr");
        const statusClass = normalizeStatus(row.status);
        
        // Shortage display logic
        let shortageBadge = "";
        const mrQty = parseInt(row.mr_qty) || 0;
        const totalReceived = parseInt(row.total_received) || 0;
        const totalIssued = parseInt(row.total_issued) || 0;

        if (statusClass !== 'done') {
            // 1. Check if receiving doesn't match MR Qty
            if (totalReceived !== mrQty) {
                const diff = mrQty - totalReceived;
                const label = diff > 0 ? `Receiving Short: ${diff}` : `Over Received: ${Math.abs(diff)}`;
                shortageBadge += `
                    <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #f6993f; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-exclamation-circle"></i>
                        ${label}
                    </div>
                `;
            }

            // 2. Check for issuing shortage
            if (totalIssued < mrQty) {
                const issueShortage = mrQty - totalIssued;
                shortageBadge += `
                    <div style="margin-top: 0.25rem; font-size: 0.75rem; color: var(--danger); font-weight: 600; display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-exclamation-triangle"></i>
                        Issuing Short: ${issueShortage}
                    </div>
                `;
            }
        }

        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600; color: #5a67d8;">${row.work_order || "-"}</td>
            <td style="font-weight: 500;">${row.customer_name || "-"}</td>
            <td>${row.item || "-"}</td>
            <td>${row.mrn_no || "-"}</td>
            <td style="font-family: monospace; font-weight: 500; color: #5a67d8;">${row.work_date || "No Date"}</td>
            <td>
                <span class="status-badge ${statusClass}">${toTitleStatus(row.status)}</span>
                ${shortageBadge}
            </td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-icon" onclick="prepareEdit(${JSON.stringify(row).replace(/"/g, "&quot;")})" title="Edit Work Order">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteWork(${row.id})" title="Delete Work Order">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        table.appendChild(tr);
    });
}

function addWork() {
    const params = new URLSearchParams();
    params.append("customer_name", document.getElementById("name").value);
    params.append("work_order", document.getElementById("work_order").value);
    params.append("mrn_no", document.getElementById("mrn_no").value);
    params.append("cut_qty", document.getElementById("cut_qty").value);
    params.append("location", document.getElementById("location").value);
    params.append("work_date", document.getElementById("work_date").value);
    params.append("status", document.getElementById("status").value);
    params.append("item_code", document.getElementById("item_code").value);
    params.append("item", document.getElementById("item").value);
    params.append("colour", document.getElementById("colour").value);
    params.append("size", document.getElementById("size").value);
    params.append("unit", document.getElementById("unit").value);
    params.append("mr_qty", document.getElementById("mr_qty").value);

    if (!params.get("customer_name") || !params.get("work_order") || !params.get("item")) {
        alert("Please provide Customer Name, Work Order, and Item.");
        return;
    }

    fetch("../backend/add_work.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
        .then(res => res.text())
        .then(data => {
            if (data.trim() === "added") {
                document.getElementById("name").value = "";
                document.getElementById("work_order").value = "";
                document.getElementById("mrn_no").value = "";
                document.getElementById("cut_qty").value = "";
                document.getElementById("location").value = "";
                document.getElementById("work_date").value = toLocalDateString(new Date());
                document.getElementById("status").value = "created";
                document.getElementById("item_code").value = "";
                document.getElementById("item").value = "";
                document.getElementById("colour").value = "";
                document.getElementById("size").value = "";
                document.getElementById("unit").value = "Pcs";
                document.getElementById("mr_qty").value = "";
                loadMasterData();
                loadTable();
                alert("New work order successfully saved.");
            } else {
                alert("Error: " + data);
            }
        });
}

function prepareEdit(row) {
    document.getElementById("display_id").innerText = row.work_order || row.id;
    document.getElementById("edit_id").value = row.id;
    loadMasterData({
        name: document.getElementById("name")?.value || "",
        edit_name: row.customer_name || "",
        item: document.getElementById("item")?.value || "",
        edit_item: row.item || "",
        size: document.getElementById("size")?.value || "",
        edit_size: row.size || ""
    });
    document.getElementById("edit_work_order").value = row.work_order || "";
    document.getElementById("edit_mrn_no").value = row.mrn_no || "";
    document.getElementById("edit_cut_qty").value = row.cut_qty || "";
    document.getElementById("edit_location").value = row.location || "";
    document.getElementById("edit_work_date").value = row.work_date || "";
    document.getElementById("edit_status").value = normalizeStatus(row.status) || "created";
    document.getElementById("edit_item_code").value = row.item_code || "";
    document.getElementById("edit_colour").value = row.colour || "";
    document.getElementById("edit_unit").value = row.unit || "Pcs";
    document.getElementById("edit_mr_qty").value = row.mr_qty || "";

    showSection("edit");
    document.getElementById("editForm").scrollIntoView({ behavior: "smooth" });
}

function updateWork() {
    const params = new URLSearchParams();
    params.append("id", document.getElementById("edit_id").value);
    params.append("customer_name", document.getElementById("edit_name").value);
    params.append("work_order", document.getElementById("edit_work_order").value);
    params.append("mrn_no", document.getElementById("edit_mrn_no").value);
    params.append("cut_qty", document.getElementById("edit_cut_qty").value);
    params.append("location", document.getElementById("edit_location").value);
    params.append("work_date", document.getElementById("edit_work_date").value);
    params.append("status", document.getElementById("edit_status").value);
    params.append("item_code", document.getElementById("edit_item_code").value);
    params.append("item", document.getElementById("edit_item").value);
    params.append("colour", document.getElementById("edit_colour").value);
    params.append("size", document.getElementById("edit_size").value);
    params.append("unit", document.getElementById("edit_unit").value);
    params.append("mr_qty", document.getElementById("edit_mr_qty").value);

    fetch("../backend/update_work.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
        .then(res => res.text())
        .then(data => {
            if (data.trim() === "updated") {
                showSection("home");
                loadTable();
                alert("Work order updated successfully.");
            } else {
                alert("Error: " + data);
            }
        });
}

function deleteWork(id) {
    if (!confirm("Are you sure you want to delete this work order?")) return;

    fetch("../backend/delete_work.php?id=" + id)
        .then(res => res.text())
        .then(data => {
            if (data.trim() === "deleted") {
                loadTable();
            } else {
                alert("Error deleting work order: " + data);
            }
        });
}

function searchWork() {
    const val = document.getElementById("searchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#tableBody tr");
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(val) ? "" : "none";
    });
}

function logout() {
    fetch("../backend/logout.php").then(() => {
        window.location.href = "login.html";
    });
}

// Load and display master data table from database
function loadMasterDataTable() {
    console.log("Loading master data table from database...");
    
    fetch("../backend/get_master_data_table.php")
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.success && Array.isArray(data.data)) {
                console.log("Master data table loaded:", data.data);
                renderMasterDataTable(data.data);
            } else {
                console.error("Unexpected response format:", data);
                renderMasterDataTable([]);
            }
        })
        .catch(err => {
            console.error("Error loading master data table:", err);
            renderMasterDataTable([]);
        });
}

// Render master data table in HTML
function renderMasterDataTable(tableData) {
    const tableBody = document.getElementById("masterDataTableBody");
    if (!tableBody) {
        console.warn("Master data table body element not found");
        return;
    }

    tableBody.innerHTML = "";

    if (!tableData || tableData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #a0aec0;">
                    <i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                    No master data yet. Add some customers, items, or sizes above.
                </td>
            </tr>
        `;
        return;
    }

    tableData.forEach((row, index) => {
        const tr = document.createElement("tr");
        
        // Format the date nicely
        const dateObj = new Date(row.created_at);
        const formattedDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Determine type badge color
        let typeColor = "var(--primary)";
        if (row.type === "Item") typeColor = "var(--info)";
        if (row.type === "Size") typeColor = "var(--warning)";
        
        tr.innerHTML = `
            <td style="text-align: center; font-weight: 600; color: #5a67d8;">${row.id}</td>
            <td>
                <span style="
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 999px;
                    background: ${typeColor}15;
                    color: ${typeColor};
                    font-size: 0.85rem;
                    font-weight: 600;
                ">
                    ${row.type}
                </span>
            </td>
            <td style="color: #1e293b; font-weight: 500;">${row.value}</td>
            <td style="color: #64748b; font-size: 0.9rem;">${formattedDate}</td>
            <td style="text-align: center;">
                <button 
                    class="btn-icon delete" 
                    onclick="deleteMasterDataTableRow(${row.id}, '${row.type.toLowerCase()}', '${row.value.replace(/'/g, "\\'")}')"
                    title="Delete this entry"
                    style="padding: 0.5rem; border-radius: 6px; transition: var(--transition);"
                >
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    console.log(`Master data table rendered with ${tableData.length} rows`);
}

// Delete master data entry via table row
function deleteMasterDataTableRow(id, type, value) {
    if (!confirm(`Delete ${value} from ${type}s?`)) return;
    
    console.log(`Deleting from table: ID=${id}, Type=${type}, Value=${value}`);
    deleteMasterData(type, value);
}

// User Management Functions removed - handled by dashboard_users.js

