/**
 * Clothing System - Premium Dashboard Logic
 */

let trendsChart, statusChart, lastData = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('trendsChart')) {
        initCharts();
        loadTable();
    }
});

/**
 * Authentication & UI Toggle
 */
function toggleAuth(mode) {
    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");
    if (loginSection && registerSection) {
        loginSection.style.display = mode === 'register' ? "none" : "block";
        registerSection.style.display = mode === 'register' ? "block" : "none";
    }
}

function socialAlert(feature) {
    if (feature === 'Password recovery') {
        let email = prompt("Please enter your registered email address:");
        if (email) alert(`A password reset link has been sent to ${email} (Mock Action) ✅`);
    } else {
        alert(`${feature} is currently under development.`);
    }
}

/**
 * Handles User Login
 */
function login() {
    let user = document.getElementById("username").value;
    let pass = document.getElementById("password").value;

    if (!user || !pass) {
        if (document.getElementById("error")) {
            document.getElementById("error").innerText = "Please fill all fields";
        }
        return;
    }

    let params = new URLSearchParams();
    params.append('username', user);
    params.append('password', pass);

    fetch("../backend/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
    .then(res => res.text())
    .then(data => {
        if (data.trim() === "success") {
            window.location.href = "dashboard.html";
        } else {
            if (document.getElementById("error")) {
                document.getElementById("error").innerText = "Invalid username or password";
            }
        }
    })
    .catch(err => {
        console.error("Login error:", err);
        if (document.getElementById("error")) {
            document.getElementById("error").innerText = "Connection error. Please try again.";
        }
    });
}

/**
 * Handles User Registration
 */
function register() {
    let user = document.getElementById("reg_username").value;
    let pass = document.getElementById("reg_password").value;

    if (!user || !pass) {
        if (document.getElementById("reg_error")) {
            document.getElementById("reg_error").innerText = "Please fill all fields";
        }
        return;
    }

    let params = new URLSearchParams();
    params.append('username', user);
    params.append('password', pass);

    fetch("../backend/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
    .then(res => res.text())
    .then(data => {
        data = data.trim();
        if (data === "success") {
            alert("Account created successfully! ✅ Please login.");
            toggleAuth('login');
        } else if (data === "exists") {
            if (document.getElementById("reg_error")) {
                document.getElementById("reg_error").innerText = "Username already taken";
            }
        } else {
            if (document.getElementById("reg_error")) {
                document.getElementById("reg_error").innerText = "Registration failed. Try again.";
            }
        }
    })
    .catch(err => {
        console.error("Registration error:", err);
        if (document.getElementById("reg_error")) {
            document.getElementById("reg_error").innerText = "Connection error. Please try again.";
        }
    });
}

/**
 * Sidebar Navigation & UI States
 */
function showSection(section) {
    // Reset active nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    const newForm = document.getElementById("newForm");
    const editForm = document.getElementById("editForm");

    if (section === 'new') {
        newForm.style.display = "block";
        editForm.style.display = "none";
        document.getElementById("nav-new").classList.add('active');
    } else if (section === 'search') {
        document.getElementById("searchInput").focus();
        document.getElementById("nav-search").classList.add('active');
    } else if (section === 'edit') {
        document.getElementById("nav-edit").classList.add('active');
        if (editForm.style.display === "none") {
            alert("Please select an order from the table to edit.");
        }
    }
}

/**
 * Chart Initialization
 */
function initCharts() {
    const ctxTrends = document.getElementById('trendsChart').getContext('2d');
    const ctxStatus = document.getElementById('statusChart').getContext('2d');

    trendsChart = new Chart(ctxTrends, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Pending',
                data: [],
                borderColor: '#f6c23e',
                backgroundColor: 'rgba(246, 194, 62, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#f6c23e'
            }, {
                label: 'Done',
                data: [],
                borderColor: '#4e73df',
                backgroundColor: 'rgba(78, 115, 223, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#4e73df'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 6, font: { size: 11 } } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { stepSize: 1, font: { size: 11 } } },
                x: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });

    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Done'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#f6c23e', '#1cc88a'],
                hoverBackgroundColor: ['#f4b619', '#17a673'],
                borderWidth: 0,
                cutout: '80%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

/**
 * Data Loading & UI Sync
 */
function loadTable() {
    const range = document.getElementById("timeRangeSelect") ? document.getElementById("timeRangeSelect").value : '7days';
    
    // 1. Fetch filtered table data
    fetch(`../backend/get_work.php?range=${range}`)
    .then(res => res.json())
    .then(data => {
        lastData = data;
        
        // Update stats and doughnut based on filtered table data
        let pendingCount = 0;
        let doneCount = 0;
        data.forEach(r => {
            if (r.status === "Pending") pendingCount++;
            else if (r.status === "Done") doneCount++;
        });
        updateStats(data.length, pendingCount, doneCount);
        statusChart.data.datasets[0].data = [pendingCount, doneCount];
        statusChart.update();
        
        renderTable(data);
    });

    // 2. Fetch structured chart data
    fetch(`../backend/get_chart_data.php?range=${range}`)
    .then(res => res.json())
    .then(chartData => {
        updateTrendChart(chartData);
    })
    .catch(err => console.error("Load error:", err));
}

function updateTrendChart(chartData) {
    if (!trendsChart) return;
    
    const labels = chartData.map(d => d.date);
    const pendingPoints = chartData.map(d => d.pending);
    const donePoints = chartData.map(d => d.done);

    trendsChart.data.labels = labels;
    trendsChart.data.datasets[0].data = pendingPoints;
    trendsChart.data.datasets[1].data = donePoints;
    trendsChart.update();
}

function updateStats(total, pending, done) {
    document.getElementById("total").innerText = total;
    document.getElementById("pending").innerText = pending;
    document.getElementById("done").innerText = done;
    
    const percent = total > 0 ? Math.round((pending / total) * 100) : 0;
    document.getElementById("pendingPercent").innerText = `${percent}%`;
}

/**
 * Helper: Format date to YYYY-MM-DD in local time
 */
function toLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Renders the table with provided data
 */
function renderTable(data) {
    const table = document.getElementById("tableBody");
    table.innerHTML = "";

    if (!data || data.length === 0) {
        table.innerHTML = "<tr><td colspan='6' style='text-align:center; padding: 2rem; color: #a0aec0;'>No active work orders found for this period</td></tr>";
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${row.id}</td>
            <td style="font-weight: 500;">${row.customer_name}</td>
            <td>${row.item_type}</td>
            <td style="font-family: monospace; font-weight: 500; color: #5a67d8;">${row.deadline || 'No Date'}</td>
            <td><span class="status-badge ${row.status.toLowerCase()}">${row.status}</span></td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-icon" onclick="prepareEdit(${JSON.stringify(row).replace(/"/g, '&quot;')})" title="Edit Order">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteWork(${row.id})" title="Delete Order">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        table.appendChild(tr);
    });
}

/**
 * CRUD Operations
 */
function addWork() {
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const item = document.getElementById("item").value;
    const deadline = document.getElementById("deadline").value;
    const measurements = document.getElementById("measurements").value;
    const notes = document.getElementById("notes").value;

    if (!name || !phone || !item) {
        alert("Please provide at least Name, Phone, and Item Type.");
        return;
    }

    const params = new URLSearchParams();
    params.append('customer_name', name);
    params.append('phone', phone);
    params.append('item_type', item);
    params.append('deadline', deadline);
    params.append('measurements', measurements);
    params.append('notes', notes);

    fetch("../backend/add_work.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
    .then(res => res.text())
    .then(data => {
        if (data.trim() === "added") {
            // Reset form
            document.getElementById("name").value = "";
            document.getElementById("phone").value = "";
            document.getElementById("item").value = "";
            document.getElementById("deadline").value = "";
            document.getElementById("measurements").value = "";
            document.getElementById("notes").value = "";
            
            loadTable();
            alert("New work order successfully saved! ✅");
        } else {
            alert("Error: " + data);
        }
    });
}

function prepareEdit(row) {
    document.getElementById("newForm").style.display = "none";
    document.getElementById("editForm").style.display = "block";
    
    document.getElementById("display_id").innerText = row.id;
    document.getElementById("edit_id").value = row.id;
    document.getElementById("edit_name").value = row.customer_name;
    document.getElementById("edit_phone").value = row.phone;
    document.getElementById("edit_item").value = row.item_type;
    document.getElementById("edit_deadline").value = row.deadline || '';
    document.getElementById("edit_status").value = row.status;
    document.getElementById("edit_measurements").value = row.measurements || '';
    document.getElementById("edit_notes").value = row.notes || '';
    
    document.getElementById("editForm").scrollIntoView({ behavior: 'smooth' });
}

function updateWork() {
    const id = document.getElementById("edit_id").value;
    const name = document.getElementById("edit_name").value;
    const phone = document.getElementById("edit_phone").value;
    const item = document.getElementById("edit_item").value;
    const deadline = document.getElementById("edit_deadline").value;
    const status = document.getElementById("edit_status").value;
    const measurements = document.getElementById("edit_measurements").value;
    const notes = document.getElementById("edit_notes").value;

    const params = new URLSearchParams();
    params.append('id', id);
    params.append('customer_name', name);
    params.append('phone', phone);
    params.append('item_type', item);
    params.append('deadline', deadline);
    params.append('status', status);
    params.append('measurements', measurements);
    params.append('notes', notes);

    fetch("../backend/update_work.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
    .then(res => res.text())
    .then(data => {
        if (data.trim() === "updated") {
            showSection('new');
            loadTable();
            alert("Order #" + id + " updated successfully! ✅");
        } else {
            alert("Error: " + data);
        }
    });
}

function deleteWork(id) {
    if (!confirm("Are you sure you want to delete order #" + id + "?")) return;
    
    fetch("../backend/delete_work.php?id=" + id)
    .then(res => res.text())
    .then(data => {
        if (data.trim() === "deleted") {
            loadTable();
        } else {
            alert("Error deleting order: " + data);
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
    fetch("../backend/logout.php").then(() => window.location.href = "login.html");
}
