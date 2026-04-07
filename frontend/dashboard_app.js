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
        loadCustomers();
        if (typeof loadMasterData === 'function') {
            loadMasterData();
        }
        loadTable();
        showSection("home");
    }
});

function loadCustomers(selectedNew = "", selectedEdit = "") {
    fetch("../backend/get_customers.php")
        .then(res => res.json())
        .then(customers => {
            populateCustomerSelect("name", customers, selectedNew);
            populateCustomerSelect("edit_name", customers, selectedEdit);
            renderCustomerList(customers);
        })
        .catch(err => console.error("Customer load error:", err));
}

function renderCustomerList(customers) {
    const list = document.getElementById("customerList");
    if (!list) return;

    list.innerHTML = "";

    if (!customers.length) {
        list.innerHTML = '<span class="customer-chip">No customers added yet</span>';
        return;
    }

    customers.forEach(customer => {
        const chip = document.createElement("span");
        chip.className = "customer-chip";
        chip.textContent = customer;
        list.appendChild(chip);
    });
}

function populateCustomerSelect(selectId, customers, selectedValue = "") {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Select customer</option>';
    const values = [...customers];
    if (selectedValue && !values.includes(selectedValue)) {
        values.push(selectedValue);
        values.sort((a, b) => a.localeCompare(b));
    }

    values.forEach(customer => {
        const option = document.createElement("option");
        option.value = customer;
        option.textContent = customer;
        option.selected = customer === selectedValue;
        select.appendChild(option);
    });
}

function addCustomerOption() {
    const input = document.getElementById("new_customer_option");
    const customer = input.value.trim();

    if (!customer) {
        alert("Enter a customer name first.");
        return;
    }

    const params = new URLSearchParams();
    params.append("customer", customer);

    fetch("../backend/add_customer.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
        .then(res => res.text())
        .then(data => {
            const response = data.trim();
            if (response === "added" || response === "exists") {
                loadCustomers(customer, document.getElementById("edit_name")?.value || "");
                input.value = "";
                if (response === "added") {
                    alert("Customer added successfully.");
                } else {
                    alert("Customer already exists.");
                }
            } else {
                alert("Error: " + data);
            }
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

function register() {
    const user = document.getElementById("reg_username").value;
    const pass = document.getElementById("reg_password").value;

    if (!user || !pass) {
        if (document.getElementById("reg_error")) {
            document.getElementById("reg_error").innerText = "Please fill all fields";
        }
        return;
    }

    const params = new URLSearchParams();
    params.append("username", user);
    params.append("password", pass);

    fetch("../backend/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
        .then(res => res.text())
        .then(data => {
            data = data.trim();
            if (data === "success") {
                alert("Account created successfully. Please login.");
                toggleAuth("login");
            } else if (data === "exists") {
                if (document.getElementById("reg_error")) {
                    document.getElementById("reg_error").innerText = "Username already taken";
                }
            } else if (document.getElementById("reg_error")) {
                document.getElementById("reg_error").innerText = "Registration failed. Try again.";
            }
        })
        .catch(err => {
            console.error("Registration error:", err);
            if (document.getElementById("reg_error")) {
                document.getElementById("reg_error").innerText = "Connection error. Please try again.";
            }
        });
}

function showSection(section) {
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
        // Load master data when section is opened
        if (typeof loadMasterData === 'function') {
            loadMasterData();
        }
    } else if (section === "edit") {
        document.getElementById("editSection").classList.remove("content-hidden");
        document.getElementById("nav-edit").classList.add("active");
    } else if (section === "receivingIssuing") {
        document.getElementById("receivingIssuingSection").classList.remove("content-hidden");
        document.getElementById("nav-receivingIssuing").classList.add("active");
        // Initialize receiving/issuing section
        if (typeof initializeReceivingIssuing === 'function') {
            initializeReceivingIssuing();
        }
    } else if (section === "customers") {
        document.getElementById("customersSection").classList.remove("content-hidden");
        document.getElementById("nav-customers").classList.add("active");
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
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600; color: #5a67d8;">${row.work_order || "-"}</td>
            <td style="font-weight: 500;">${row.customer_name || "-"}</td>
            <td>${row.item || "-"}</td>
            <td>${row.mrn_no || "-"}</td>
            <td style="font-family: monospace; font-weight: 500; color: #5a67d8;">${row.work_date || "No Date"}</td>
            <td><span class="status-badge ${statusClass}">${toTitleStatus(row.status)}</span></td>
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
                loadCustomers();

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
    loadCustomers(document.getElementById("name").value, row.customer_name || "");
    document.getElementById("edit_work_order").value = row.work_order || "";
    document.getElementById("edit_mrn_no").value = row.mrn_no || "";
    document.getElementById("edit_cut_qty").value = row.cut_qty || "";
    document.getElementById("edit_location").value = row.location || "";
    document.getElementById("edit_work_date").value = row.work_date || "";
    document.getElementById("edit_status").value = normalizeStatus(row.status) || "created";
    document.getElementById("edit_item_code").value = row.item_code || "";
    document.getElementById("edit_item").value = row.item || "";
    document.getElementById("edit_colour").value = row.colour || "";
    document.getElementById("edit_size").value = row.size || "";
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

function searchEditWorkOrders() {
    const searchInput = document.getElementById("editSearchInput");
    const searchResults = document.getElementById("editSearchResults");
    const searchVal = searchInput.value.toLowerCase().trim();

    if (!searchVal) {
        searchResults.style.display = "none";
        return;
    }

    // Filter work orders from lastData
    const filtered = lastData.filter(row => {
        const workOrder = (row.work_order || "").toLowerCase();
        const customer = (row.customer_name || "").toLowerCase();
        const mrn = (row.mrn_no || "").toLowerCase();
        const item = (row.item || "").toLowerCase();

        return (
            workOrder.includes(searchVal) ||
            customer.includes(searchVal) ||
            mrn.includes(searchVal) ||
            item.includes(searchVal)
        );
    });

    // Display results
    if (filtered.length === 0) {
        searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: #999;">No work orders found</div>';
        searchResults.style.display = "block";
        return;
    }

    searchResults.innerHTML = "";
    filtered.forEach(row => {
        const resultItem = document.createElement("div");
        resultItem.className = "edit-search-result-item";
        resultItem.innerHTML = `
            <div class="result-info">
                <div class="result-work-order">WO: ${row.work_order || "N/A"}</div>
                <div class="result-details">
                    <div class="result-detail">
                        <span class="result-detail-label">Customer:</span>
                        <span class="result-detail-value">${row.customer_name || "N/A"}</span>
                    </div>
                    <div class="result-detail">
                        <span class="result-detail-label">MRN:</span>
                        <span class="result-detail-value">${row.mrn_no || "N/A"}</span>
                    </div>
                    <div class="result-detail">
                        <span class="result-detail-label">Item:</span>
                        <span class="result-detail-value">${row.item || "N/A"}</span>
                    </div>
                    <div class="result-detail">
                        <span class="result-detail-label">Status:</span>
                        <span class="result-detail-value">${toTitleStatus(row.status)}</span>
                    </div>
                </div>
            </div>
            <button class="result-select-btn" onclick="prepareEdit(${JSON.stringify(row).replace(/"/g, "&quot;")})">
                Select & Edit
            </button>
        `;
        searchResults.appendChild(resultItem);
    });

    searchResults.style.display = "block";
}

function logout() {
    fetch("../backend/logout.php").then(() => {
        window.location.href = "login.html";
    });
}
