/**
 * Stores System - Comprehensive Dashboard Logic
 * Handles Work Orders, Master Data, Charts, and UI Navigation
 */

let trendsChart, statusChart, lastData = [];
let backupCountdownTimer = null;
let hourlyBackupTimer = null;

const HOURLY_BACKUP_LOCK_KEY = "stores:lastHourlyBackupHour";

// Helper: Normalize status string for CSS classes
function normalizeStatus(status) {
    return String(status || "").trim().toLowerCase();
}

// Helper: Convert status to Title Case for display
function toTitleStatus(status) {
    const value = normalizeStatus(status);
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Created";
}

// Helper: Format date to YYYY-MM-DD in local time
function toLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function getNextHourlyBackupTime(now = new Date()) {
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
}

function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(part => String(part).padStart(2, "0")).join(":");
}

function updateBackupCountdown() {
    const valueEl = document.getElementById("backupCountdownValue");
    const nextEl = document.getElementById("backupCountdownNext");
    if (!valueEl || !nextEl) return;

    const now = new Date();
    const nextBackup = getNextHourlyBackupTime(now);
    const remaining = nextBackup.getTime() - now.getTime();

    valueEl.textContent = formatDuration(remaining);
    nextEl.textContent = `Next backup at ${nextBackup.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    })}`;
}

function startBackupCountdown() {
    updateBackupCountdown();

    if (backupCountdownTimer) {
        clearInterval(backupCountdownTimer);
    }

    backupCountdownTimer = setInterval(updateBackupCountdown, 1000);
}

function getCurrentBackupHourKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    return `${y}-${m}-${d} ${h}`;
}

async function runHourlyBackup() {
    const hourKey = getCurrentBackupHourKey();

    try {
        const lastRunHour = localStorage.getItem(HOURLY_BACKUP_LOCK_KEY);
        if (lastRunHour === hourKey) {
            return;
        }

        // Claim this hour before the request to avoid duplicate triggers across tabs.
        localStorage.setItem(HOURLY_BACKUP_LOCK_KEY, hourKey);

        const response = await fetch("../backend/backup_automation.php?format=json", {
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || "Backup failed");
        }

        console.log("Hourly backup completed:", result);
    } catch (error) {
        console.error("Hourly backup failed:", error);
        // Clear the lock so the next scheduled attempt can retry this hour.
        if (localStorage.getItem(HOURLY_BACKUP_LOCK_KEY) === hourKey) {
            localStorage.removeItem(HOURLY_BACKUP_LOCK_KEY);
        }
    }
}

function scheduleHourlyBackup() {
    if (hourlyBackupTimer) {
        clearTimeout(hourlyBackupTimer);
    }

    const now = new Date();
    const nextBackup = getNextHourlyBackupTime(now);
    const delay = Math.max(1000, nextBackup.getTime() - now.getTime());

    hourlyBackupTimer = setTimeout(async () => {
        await runHourlyBackup();
        scheduleHourlyBackup();
    }, delay);
}

/**
 * Initialization on Page Load
 */
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("trendsChart")) {
        // Set default date to today for the new work order form
        const workDateInput = document.getElementById("work_date");
        if (workDateInput && !workDateInput.value) {
            workDateInput.value = toLocalDateString(new Date());
        }
        
        startBackupCountdown();
        scheduleHourlyBackup();
        initCharts();
        loadMasterData();     // Load dropdowns
        loadMasterDataTable(); // Load master data management table
        loadTable();          // Load main work orders table
        
        // Ensure home section is shown
        if (typeof showSection === 'function') {
            showSection("home");
        }
    }
});

/**
 * Master Data Management
 */

// Fetch master data of a specific type (customer, item, size)
function fetchMasterData(type) {
    console.log(`Fetching master data for type: ${type}`);
    return fetch(`../backend/get_master_data.php?type=${encodeURIComponent(type)}`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
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

// Load all master data and populate UI elements
function loadMasterData(selections = {}) {
    console.log("Loading all master data...");
    
    return Promise.all([
        fetchMasterData("customer"),
        fetchMasterData("item"),
        fetchMasterData("size")
    ])
    .then(([customers, items, sizes]) => {
        // Populate dropdowns in New and Edit forms
        populateSelect("name", customers, "Select customer", selections.name || "");
        populateSelect("edit_name", customers, "Select customer", selections.edit_name || "");
        populateSelect("item", items, "Select item", selections.item || "");
        populateSelect("edit_item", items, "Select item", selections.edit_item || "");
        populateSelect("size", sizes, "Select size", selections.size || "");
        populateSelect("edit_size", sizes, "Select size", selections.edit_size || "");

        // Update the chips/lists in Master Data management section
        renderMasterList("customerList", customers, "No customers added yet");
        renderMasterList("itemList", items, "No items added yet");
        renderMasterList("sizeList", sizes, "No sizes added yet");
    })
    .catch(err => console.error("Master data load error:", err));
}

// Populate a select element with values
function populateSelect(selectId, values, placeholder, selectedValue = "") {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = `<option value="">${placeholder}</option>`;
    
    const optionValues = Array.isArray(values) ? [...values] : [];
    
    // Ensure selected value is present even if it's not in the master list currently
    if (selectedValue && !optionValues.includes(selectedValue)) {
        optionValues.push(selectedValue);
        optionValues.sort((a, b) => a.localeCompare(b));
    }

    optionValues.forEach(value => {
        if (!value) return;
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = (value === selectedValue);
        select.appendChild(option);
    });
}

// Render chips for master data lists
function renderMasterList(listId, values, emptyLabel) {
    const list = document.getElementById(listId);
    if (!list) return;

    list.innerHTML = "";

    if (!values || values.length === 0) {
        list.innerHTML = `<span class="customer-chip empty-state">${emptyLabel}</span>`;
        return;
    }

    const typeMap = { customerList: "customer", itemList: "item", sizeList: "size" };
    const type = typeMap[listId];

    values.forEach(value => {
        const chip = document.createElement("span");
        chip.className = "customer-chip";
        
        const textSpan = document.createElement("span");
        textSpan.textContent = value;
        textSpan.style.marginRight = "0.5rem";
        
        const deleteBtn = document.createElement("span");
        deleteBtn.className = "chip-delete";
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteMasterData(type, value);
        };
        
        chip.appendChild(textSpan);
        chip.appendChild(deleteBtn);
        list.appendChild(chip);
    });
}

// Add new master data entry
function addMasterData(type) {
    const inputMap = { customer: "new_customer_option", item: "new_item_option", size: "new_size_option" };
    const input = document.getElementById(inputMap[type]);
    if (!input) return;
    
    const value = input.value.trim();
    if (!value) {
        alert(`Please enter a ${type} name.`);
        input.focus();
        return;
    }

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
        if (response === "added") {
            input.value = "";
            alert(`✓ ${toTitleStatus(type)} added successfully!`);
            reloadMasterDataLists();
        } else if (response === "exists") {
            alert(`ℹ This ${type} already exists.`);
        } else {
            alert(`❌ Error: ${data}`);
        }
    });
}

// Delete master data entry
function deleteMasterData(type, value) {
    if (!confirm(`Delete "${value}" from ${type}s?`)) return;

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
        if (data.trim() === "deleted") {
            alert(`✓ Deleted successfully!`);
            reloadMasterDataLists();
        } else {
            alert(`❌ Error: ${data}`);
        }
    });
}

// Refresh all master data UI components
function reloadMasterDataLists() {
    loadMasterData();
    loadMasterDataTable();
}

/**
 * Main Dashboard Functions (Table & Charts)
 */

function initCharts() {
    const ctxTrends = document.getElementById("trendsChart")?.getContext("2d");
    const ctxStatus = document.getElementById("statusChart")?.getContext("2d");
    if (!ctxTrends || !ctxStatus) return;

    // Destroy existing charts if they exist (to avoid Chart.js errors on re-init)
    if (trendsChart instanceof Chart) trendsChart.destroy();
    if (statusChart instanceof Chart) statusChart.destroy();

    trendsChart = new Chart(ctxTrends, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Pending",
                    data: [],
                    borderColor: "#f6c23e",
                    backgroundColor: "transparent",
                    fill: false,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: "#f6c23e",
                    pointBorderColor: "#f6c23e"
                },
                {
                    label: "Done",
                    data: [],
                    borderColor: "#4e73df",
                    backgroundColor: "transparent",
                    fill: false,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: "#4e73df",
                    pointBorderColor: "#4e73df"
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 4,
                    right: 6,
                    bottom: 0,
                    left: 0
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    align: "end",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 12,
                        color: "#6b7280",
                        font: {
                            size: 12,
                            family: "Poppins"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    padding: 12,
                    cornerRadius: 10
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 1,
                    grid: {
                        color: "#e5e7eb"
                    },
                    ticks: {
                        stepSize: 1,
                        precision: 0,
                        color: "#6b7280",
                        font: {
                            size: 11,
                            family: "Poppins"
                        }
                    },
                    border: {
                        color: "#d1d5db"
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: "#6b7280",
                        font: {
                            size: 11,
                            family: "Poppins"
                        }
                    },
                    border: {
                        color: "#d1d5db"
                    }
                }
            }
        }
    });

    statusChart = new Chart(ctxStatus, {
        type: "doughnut",
        data: {
            labels: ["Pending", "Done"],
            datasets: [{
                data: [0, 0],
                backgroundColor: ["#f6c23e", "#4e73df"],
                hoverBackgroundColor: ["#f4b619", "#3751c8"],
                borderWidth: 0,
                cutout: "80%"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    align: "end",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 10,
                        color: "#6b7280",
                        font: {
                            size: 12,
                            family: "Poppins"
                        }
                    }
                }
            }
        }
    });
}

function loadWorkRows(range, fallbackToAll = true) {
    return fetch(`../backend/get_work.php?range=${encodeURIComponent(range)}`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data) && data.length === 0 && fallbackToAll && range !== "all") {
                return loadWorkRows("all", false);
            }
            return data;
        });
}

function loadShortageRows() {
    return fetch("../backend/get_work_with_shortage.php")
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) return data;
            if (data && data.success && Array.isArray(data.data)) return data.data;
            return [];
        });
}

function loadTrendRows(range, fallbackToAll = true) {
    return fetch(`../backend/get_chart_data.php?range=${encodeURIComponent(range)}`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data) && data.length === 0 && fallbackToAll && range !== "all") {
                return loadTrendRows("all", false);
            }
            return data;
        });
}

function loadTable() {
    loadShortageRows()
        .then(data => {
            const shortageRows = Array.isArray(data) ? data : [];
            lastData = shortageRows;

            const pendingCount = shortageRows.length;
            updateStats(pendingCount, pendingCount, 0);
            if (statusChart) {
                statusChart.data.datasets[0].data = [pendingCount, 0];
                statusChart.update();
            }
            renderTable(shortageRows);
        })
        .catch(err => {
            console.error("Load table error:", err);
            const tableBody = document.getElementById("tableBody");
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #c53030;">Failed to load shortage work orders from database</td></tr>`;
            }
        });

    const rangeSelect = document.getElementById("timeRangeSelect");
    const range = rangeSelect ? rangeSelect.value : "7days";

    loadTrendRows(range)
        .then(chartData => {
            if (trendsChart) {
                trendsChart.data.labels = chartData.map(d => d.date);
                trendsChart.data.datasets[0].data = chartData.map(d => d.pending);
                trendsChart.data.datasets[1].data = chartData.map(d => d.done);
                trendsChart.update();
            }
        })
        .catch(err => {
            console.error("Load chart error:", err);
        });
}

function groupShortageWorkOrders(rows) {
    const groups = new Map();

    rows.forEach(row => {
        const workOrder = row.work_order;
        if (!workOrder) return;

        const existing = groups.get(workOrder) || {
            id: row.id,
            customer_name: row.customer_name,
            work_order: row.work_order,
            mrn_no: row.mrn_no,
            cut_qty: row.cut_qty,
            location: row.location,
            work_date: row.work_date,
            status: row.status,
            product_id: row.product_id,
            item_code: row.item_code,
            item: row.item,
            colour: row.colour,
            size: row.size,
            unit: row.unit,
            mr_qty: row.mr_qty,
            total_received: 0,
            total_issued: 0,
            receiving_over_mr: 0,
            receiving_shortage: 0,
            issuing_shortage: 0,
            issuing_over_mr: 0,
            product_count: 0,
            item_summary: [],
            hasShortage: false,
            hasActiveShortage: false,
            shortestStatus: ""
        };

        existing.product_count += 1;
        existing.total_received += parseInt(row.total_received) || 0;
        existing.total_issued += parseInt(row.total_issued) || 0;
        existing.receiving_over_mr = Math.max(existing.receiving_over_mr, parseInt(row.receiving_over_mr) || 0);
        existing.receiving_shortage = Math.max(existing.receiving_shortage, parseInt(row.receiving_shortage) || 0);
        existing.issuing_shortage = Math.max(existing.issuing_shortage, parseInt(row.issuing_shortage) || 0);
        existing.issuing_over_mr = Math.max(existing.issuing_over_mr, parseInt(row.issuing_over_mr) || 0);
        existing.hasShortage = existing.hasShortage || !!row.hasShortage;
        existing.hasActiveShortage = existing.hasActiveShortage || (!!row.hasShortage && !row.shortage_ignored);

        const itemLabel = [row.item, row.colour, row.size].filter(Boolean).join(" / ");
        if (itemLabel && !existing.item_summary.includes(itemLabel)) {
            existing.item_summary.push(itemLabel);
        }

        groups.set(workOrder, existing);
    });

    return Array.from(groups.values())
        .filter(row => row.hasActiveShortage)
        .sort((a, b) => {
            const aDate = a.work_date || "";
            const bDate = b.work_date || "";
            return bDate.localeCompare(aDate);
        })
        .map(row => ({
            ...row,
            item_summary: row.item_summary.join(", ")
        }));
}

function updateStats(total, pending, done) {
    if (document.getElementById("total")) document.getElementById("total").innerText = total;
    if (document.getElementById("pending")) document.getElementById("pending").innerText = pending;
    if (document.getElementById("done")) document.getElementById("done").innerText = done;
    
    const percent = total > 0 ? Math.round((pending / total) * 100) : 0;
    if (document.getElementById("pendingPercent")) document.getElementById("pendingPercent").innerText = `${percent}%`;
}

function renderTable(data) {
    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (!data || data.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding: 2rem; color: #a0aec0;'>No shortage work orders found</td></tr>";
        return;
    }

    data.forEach(row => {
        const tr = document.createElement("tr");
        const statusClass = "pending";
        
        const receivingStatus = row.receiving_over_mr > 0
            ? `Receiving: Over by ${row.receiving_over_mr}`
            : row.receiving_shortage > 0
                ? `Receiving: Short by ${row.receiving_shortage}`
                : `Receiving: Matched`;

        const issuingStatus = row.issuing_over_mr > 0
            ? `Issuing: Over by ${row.issuing_over_mr}`
            : row.issuing_shortage > 0
                ? `Issuing: Short by ${row.issuing_shortage}`
                : `Issuing: Matched`;

        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600; color: #5a67d8;">${row.work_order || "-"}</td>
            <td style="font-weight: 500;">${row.customer_name || "-"}</td>
            <td>
                ${row.item_summary || row.item || "-"}
                ${row.product_count > 1 ? `<div style="font-size: 0.75rem; color: #94a3b8;">${row.product_count} products</div>` : ""}
            </td>
            <td>${row.mrn_no || "-"}</td>
            <td style="font-family: monospace; font-size: 0.85rem;">${row.work_date || "-"}</td>
            <td>
                <span class="status-badge ${statusClass}">Shortage</span>
                <div class="shortage-note warning"><i class="fas fa-exclamation-circle"></i> ${receivingStatus}</div>
                <div class="shortage-note danger"><i class="fas fa-exclamation-triangle"></i> ${issuingStatus}</div>
            </td>
            <td>
                <button class="btn-icon delete" onclick="ignoreWorkOrderShortage('${row.work_order}')">
                    <i class="fas fa-ban"></i> Ignore
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

/**
 * Work Order Operations
 */

function deleteWork(id) {
    if (!confirm("Delete this entire work order and its products?")) return;
    fetch(`../backend/delete_work.php?id=${id}`)
        .then(res => res.text())
        .then(data => {
            if (data.trim() === "deleted") loadTable();
            else alert("Error: " + data);
        });
}

function ignoreWorkOrderShortage(workOrder) {
    if (!workOrder) return;
    if (!confirm(`Ignore shortage for work order "${workOrder}"?`)) return;

    const params = new URLSearchParams();
    params.append("work_order", workOrder);

    fetch("../backend/ignore_work_order_shortage.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadTable();
        } else {
            alert("Error: " + (data.error || "Failed to ignore shortage"));
        }
    })
    .catch(err => {
        alert("Error: " + err.message);
    });
}

async function prepareEdit(row) {
    document.getElementById("display_id").innerText = row.work_order || row.id;
    document.getElementById("edit_id").value = row.id;
    document.getElementById("edit_product_id").value = row.product_id || "";

    showSection("edit");

    const loadingMessage = document.getElementById("editLoadingMessage");
    if (loadingMessage) {
        loadingMessage.style.display = "block";
        loadingMessage.textContent = "Loading work order from database...";
    }

    try {
        const workOrder = row.work_order || "";
        if (!workOrder) {
            throw new Error("Work order not found");
        }

        const response = await fetch(`../backend/get_work.php?work_order=${encodeURIComponent(workOrder)}`);
        const details = await response.json();

        if (!Array.isArray(details) || details.length === 0) {
            throw new Error("No matching work order records found in database");
        }

        const selectedProduct = row.product_id
            ? details.find(item => String(item.product_id) === String(row.product_id))
            : details[0];
        const productRow = selectedProduct || details[0];
        const headerRow = details[0];

        await loadMasterData({
            edit_name: headerRow.customer_name || "",
            edit_item: productRow.item || "",
            edit_size: productRow.size || ""
        });

        document.getElementById("edit_work_order").value = headerRow.work_order || "";
        document.getElementById("edit_mrn_no").value = headerRow.mrn_no || "";
        document.getElementById("edit_cut_qty").value = headerRow.cut_qty || "";
        document.getElementById("edit_location").value = headerRow.location || "";
        document.getElementById("edit_work_date").value = headerRow.work_date || "";
        document.getElementById("edit_status").value = normalizeStatus(headerRow.status) || "created";
        document.getElementById("edit_item_code").value = productRow.item_code || "";
        document.getElementById("edit_colour").value = productRow.colour || "";
        document.getElementById("edit_unit").value = productRow.unit || "Pcs";
        document.getElementById("edit_mr_qty").value = productRow.mr_qty || "";
        document.getElementById("edit_product_id").value = productRow.product_id || row.product_id || "";
    } catch (error) {
        console.error("Failed to load edit data:", error);
        if (loadingMessage) {
            loadingMessage.textContent = `Failed to load work order: ${error.message}`;
        }
        alert(`Could not load work order details: ${error.message}`);
    } finally {
        if (loadingMessage) {
            loadingMessage.style.display = "none";
        }
    }
}

function updateWork() {
    const params = new URLSearchParams();
    const fields = ["id", "product_id", "customer_name", "mrn_no", "cut_qty", "location", "work_date", "status", "item_code", "item", "colour", "size", "unit", "mr_qty"];
    fields.forEach(f => {
        const el = document.getElementById("edit_" + f);
        if (el) params.append(f, el.value);
    });

    fetch("../backend/update_work.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
    .then(res => res.text())
    .then(data => {
        if (data.trim() === "updated") {
            alert("✓ Updated successfully!");
            showSection("home");
            loadTable();
        } else {
            alert("Error: " + data);
        }
    });
}

/**
 * Navigation & User Auth
 */

function showSection(section) {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".content-section").forEach(panel => panel.classList.add("content-hidden"));

    const target = document.getElementById(section + "Section");
    const nav = document.getElementById("nav-" + section);
    if (target) target.classList.remove("content-hidden");
    if (nav) nav.classList.add("active");

    // Dynamic section loading
    if (section === "home") loadTable();
    if (section === "master") reloadMasterDataLists();
    if (section === "users" && typeof loadUsers === "function") loadUsers();
    if (section === "receivingIssuing" && typeof initializeReceivingIssuing === "function") initializeReceivingIssuing();
}

function login() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    if (!user || !pass) {
        if (document.getElementById("error")) document.getElementById("error").innerText = "Fill all fields";
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
        if (data.trim() === "success") window.location.href = "dashboard.html";
        else if (document.getElementById("error")) document.getElementById("error").innerText = "Invalid credentials";
    });
}

function logout() {
    fetch("../backend/logout.php").then(() => window.location.href = "login.html");
}

function socialAlert(f) { alert(f + " is under development."); }

// Master Data Table View
function loadMasterDataTable() {
    fetch("../backend/get_master_data_table.php")
    .then(res => res.json())
    .then(data => {
        if (data.success) renderMasterDataTable(data.data);
    });
}

function renderMasterDataTable(data) {
    const tbody = document.getElementById("masterDataTableBody");
    if (!tbody) return;
    tbody.innerHTML = data.map(row => `
        <tr>
            <td style="text-align:center;">${row.id}</td>
            <td><span class="type-badge ${row.type.toLowerCase()}">${row.type}</span></td>
            <td>${row.value}</td>
            <td><small>${row.created_at}</small></td>
            <td style="text-align:center;">
                <button class="btn-icon delete" onclick="deleteMasterData('${row.type.toLowerCase()}', '${row.value}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * Reporting & Advanced Search
 */

function generateReport(woNumber = null) {
    const searchInput = document.getElementById("reportSearchInput");
    const workOrder = woNumber || searchInput?.value.trim();

    if (!workOrder) {
        alert("Please enter a Work Order number.");
        return;
    }

    fetch(`../backend/get_work.php?work_order=${encodeURIComponent(workOrder)}`)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                alert("Work Order not found.");
                return;
            }

            const header = data[0];
            document.getElementById('report_wo_display').textContent = header.work_order;
            document.getElementById('rpt_customer_name').textContent = header.customer_name || 'N/A';
            document.getElementById('rpt_location').textContent = header.location || 'N/A';
            document.getElementById('rpt_mrn_no').textContent = header.mrn_no || 'N/A';
            document.getElementById('rpt_work_order').textContent = header.work_order;
            document.getElementById('rpt_work_date').textContent = header.work_date || 'N/A';
            document.getElementById('rpt_cut_qty').textContent = header.cut_qty || '0';
            
            const statusClass = normalizeStatus(header.status);
            document.getElementById('rpt_status_badge').innerHTML = `<span class="status-badge ${statusClass}">${toTitleStatus(header.status)}</span>`;

            const tbody = document.getElementById('rpt_product_body');
            tbody.innerHTML = data.map(row => {
                const mrQty = parseInt(row.mr_qty) || 0;
                const received = parseInt(row.total_received) || 0;
                const issued = parseInt(row.total_issued) || 0;
                const balance = received - issued;
                return `
                    <tr>
                        <td><strong>${row.item}</strong><br><small>Code: ${row.item_code || 'N/A'}</small></td>
                        <td style="text-align:center;">${row.colour || 'N/A'} / ${row.size || 'N/A'}</td>
                        <td style="text-align:center;">${mrQty}</td>
                        <td style="text-align:center; color:var(--info);">${received}</td>
                        <td style="text-align:center; color:var(--primary);">${issued}</td>
                        <td style="text-align:right; font-weight:700;">${balance}</td>
                    </tr>
                `;
            }).join('');

            showSection('report');
        });
}

function generateReportFromSearch() {
    const input = document.getElementById("reportSearchInput");
    const resultsDiv = document.getElementById("reportSearchResults");
    if (resultsDiv) resultsDiv.style.display = "none";
    generateReport(input ? input.value.trim() : "");
}

function handleReportSearchKeydown(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        generateReportFromSearch();
    }
}

function returnToSearch() {
    showSection("search");

    setTimeout(() => {
        const input = document.getElementById("reportSearchInput");
        if (input) {
            input.focus();
            input.select?.();
        }
    }, 50);
}

function suggestReportOrders() {
    const input = document.getElementById("reportSearchInput");
    const resultsDiv = document.getElementById("reportSearchResults");
    if (!input || !resultsDiv) return;
    const val = input.value.toLowerCase().trim();

    if (!val) {
        resultsDiv.style.display = "none";
        return;
    }

    const filtered = lastData.filter(row => 
        (row.work_order && row.work_order.toLowerCase().includes(val)) ||
        (row.customer_name && row.customer_name.toLowerCase().includes(val)) ||
        (row.mrn_no && row.mrn_no.toLowerCase().includes(val))
    );

    if (filtered.length === 0) {
        resultsDiv.innerHTML = '<div class="suggestion-item" style="color:#999; cursor:default;">No matches found</div>';
        resultsDiv.style.display = "block";
        return;
    }

    resultsDiv.innerHTML = "";
    const uniqueWOs = {};
    filtered.forEach(row => {
        if (!uniqueWOs[row.work_order]) {
            uniqueWOs[row.work_order] = true;
            const div = document.createElement("div");
            div.className = "suggestion-item";
            div.innerHTML = `<strong>${row.work_order}</strong> - ${row.customer_name} <small>(${row.mrn_no || 'No MRN'})</small>`;
            div.onclick = () => {
                input.value = row.work_order;
                resultsDiv.style.display = "none";
                generateReport(row.work_order);
            };
            resultsDiv.appendChild(div);
        }
    });
    resultsDiv.style.display = "block";
}

function searchEditWorkOrders() {
    const input = document.getElementById("editSearchInput");
    const resultsDiv = document.getElementById("editSearchResults");
    if (!input || !resultsDiv) return;
    const val = input.value.toLowerCase().trim();

    if (!val) {
        resultsDiv.style.display = "none";
        return;
    }

    const filtered = lastData.filter(row => 
        (row.work_order && row.work_order.toLowerCase().includes(val)) ||
        (row.customer_name && row.customer_name.toLowerCase().includes(val)) ||
        (row.mrn_no && row.mrn_no.toLowerCase().includes(val))
    );

    resultsDiv.innerHTML = "";
    const uniqueWOs = {};
    
    filtered.slice(0, 10).forEach(row => {
        if (!uniqueWOs[row.work_order]) {
            uniqueWOs[row.work_order] = true;
            const div = document.createElement("div");
            div.className = "suggestion-item";
            div.innerHTML = `<strong>${row.work_order}</strong> - ${row.customer_name} <small>(${row.item})</small>`;
            div.onclick = () => {
                input.value = row.work_order;
                resultsDiv.style.display = "none";
                prepareEdit(row);
            };
            resultsDiv.appendChild(div);
        }
    });

    resultsDiv.style.display = "block";
}
