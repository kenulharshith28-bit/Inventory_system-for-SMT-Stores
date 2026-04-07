/**
 * Receiving & Issuing Management System - Workflow-based UI
 */

let allWorkOrders = [];
let currentWorkOrder = null;
let currentProduct = null;

// Initialize receiving and issuing section
function initializeReceivingIssuing() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('receiving_date').value = today;
    document.getElementById('issuing_date').value = today;

    // Load all work orders
    loadAllWorkOrders();
    loadIncompleteWorkOrders();
}

// Load all work orders
function loadAllWorkOrders() {
    fetch('../backend/get_work_with_shortage.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allWorkOrders = data.data;
            }
        })
        .catch(err => console.error('Error loading work orders:', err));
}

// Search work orders by WO #, Customer, or Item
function searchWorkOrders() {
    const searchVal = document.getElementById('wo_search').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('woSearchResults');

    if (!searchVal) {
        resultsDiv.style.display = 'none';
        return;
    }

    // Filter work orders
    const filtered = allWorkOrders.filter(wo => {
        const woMatch = (wo.work_order || '').toLowerCase().includes(searchVal);
        const customerMatch = (wo.customer_name || '').toLowerCase().includes(searchVal);
        const itemMatch = (wo.item || '').toLowerCase().includes(searchVal);
        return woMatch || customerMatch || itemMatch;
    });

    if (filtered.length === 0) {
        resultsDiv.innerHTML = '<div style="padding: 0.75rem 1rem; color: #999;">No work orders found</div>';
        resultsDiv.style.display = 'block';
        return;
    }

    // Remove duplicates (same work order can have multiple products)
    const uniqueWOs = {};
    filtered.forEach(wo => {
        if (!uniqueWOs[wo.work_order]) {
            uniqueWOs[wo.work_order] = wo;
        }
    });

    resultsDiv.innerHTML = '';
    for (const [woNumber, woData] of Object.entries(uniqueWOs)) {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <div class="result-highlight">${woNumber}</div>
            <div class="result-subtitle">${woData.customer_name || 'N/A'}</div>
        `;
        item.onclick = () => selectWorkOrder(woData);
        resultsDiv.appendChild(item);
    }

    resultsDiv.style.display = 'block';
}

// Select work order
function selectWorkOrder(woData) {
    currentWorkOrder = woData;
    
    // Update UI
    document.getElementById('wo_search').value = woData.work_order;
    document.getElementById('woSearchResults').style.display = 'none';
    document.getElementById('selectedWONumber').textContent = woData.work_order;
    document.getElementById('selectedWOCustomer').textContent = woData.customer_name || 'N/A';
    document.getElementById('selectedWOInfo').style.display = 'block';

    // Enable step 2
    const step2 = document.getElementById('step2Container');
    step2.style.display = 'block';
    step2.style.opacity = '1';
    step2.classList.add('active');

    // Populate products
    populateProductsForWO();

    // Hide step 3
    document.getElementById('step3Container').style.display = 'none';
    currentProduct = null;
}

// Populate products for selected work order
function populateProductsForWO() {
    if (!currentWorkOrder) return;

    const selector = document.getElementById('product_selector');
    selector.innerHTML = '<option value="">Select a product</option>';

    // Get all products for this work order
    const products = allWorkOrders.filter(wo => wo.work_order === currentWorkOrder.work_order);
    
    const uniqueProducts = {};
    products.forEach(product => {
        if (product.product_id) {
            const key = `${product.item || 'Unknown'}-${product.colour || 'N/A'}-${product.size || 'N/A'}`;
            if (!uniqueProducts[key]) {
                uniqueProducts[key] = product;
            }
        }
    });

    for (const [key, product] of Object.entries(uniqueProducts)) {
        const option = document.createElement('option');
        option.value = JSON.stringify(product);
        option.textContent = `${product.item || 'Unknown'} - ${product.colour || 'N/A'} - ${product.size || 'N/A'}`;
        selector.appendChild(option);
    }
}

// Select product
function selectProduct() {
    const selector = document.getElementById('product_selector');
    const value = selector.value;

    if (!value) {
        document.getElementById('step3Container').style.display = 'none';
        currentProduct = null;
        return;
    }

    currentProduct = JSON.parse(value);

    // Update product info display
    document.getElementById('productItem').textContent = currentProduct.item || 'N/A';
    document.getElementById('productColour').textContent = currentProduct.colour || 'N/A';
    document.getElementById('productSize').textContent = currentProduct.size || 'N/A';
    document.getElementById('productMRQty').textContent = currentProduct.mr_qty || '0';
    document.getElementById('selectedProductInfo').style.display = 'block';

    // Enable step 3
    const step3 = document.getElementById('step3Container');
    step3.style.display = 'block';
    step3.style.opacity = '1';
    step3.classList.add('active');

    // Clear forms
    document.getElementById('receiving_qty').value = '';
    document.getElementById('receiving_notes').value = '';
    document.getElementById('issuing_qty').value = '';
    document.getElementById('issuing_notes').value = '';
    document.getElementById('receiving_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('issuing_date').value = new Date().toISOString().split('T')[0];

    // Load product details
    loadProductDetails();
}

// Load product details and history
function loadProductDetails() {
    if (!currentProduct || !currentProduct.product_id) return;

    fetch(`../backend/get_receiving_issuing.php?product_id=${currentProduct.product_id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const calc = data.calculations;
                
                // Update Receiving Summary
                document.getElementById('summary_mr_qty').textContent = calc.mr_qty;
                document.getElementById('summary_total_received').textContent = calc.total_received;
                document.getElementById('summary_total_issued').textContent = calc.total_issued;
                document.getElementById('summary_remaining').textContent = calc.balance; // Stock Balance

                // Update Issuing Summary
                document.getElementById('summary_mr_qty_issuing').textContent = calc.mr_qty;
                document.getElementById('summary_total_received_issuing').textContent = calc.total_received;
                document.getElementById('summary_total_issued_issuing').textContent = calc.total_issued;
                document.getElementById('summary_remaining_issuing').textContent = calc.mr_shortage; // Shortage

                // Show shortage alert if needed
                if (data.hasShortage) {
                    showShortageAlert(data.product, calc.mr_shortage);
                } else {
                    document.getElementById('shortageAlert').classList.remove('show');
                }

                // Show history
                if (data.receiving && data.receiving.length > 0) {
                    displayReceivingHistory(data.receiving);
                } else {
                    document.getElementById('receivingHistory').style.display = 'none';
                }
                
                if (data.issuing && data.issuing.length > 0) {
                    displayIssuingHistory(data.issuing);
                } else {
                    document.getElementById('issuingHistory').style.display = 'none';
                }
            }
        })
        .catch(err => console.error('Error loading product details:', err));
}

// Display receiving history
function displayReceivingHistory(history) {
    const historyDiv = document.getElementById('receivingHistory');
    const historyList = document.getElementById('receivingHistoryList');

    historyList.innerHTML = '';
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-qty">${item.received_qty} units</span>
                <span class="history-item-date">${item.received_date}</span>
            </div>
            ${item.received_notes ? `<div class="history-item-notes">${item.received_notes}</div>` : ''}
        `;
        historyList.appendChild(historyItem);
    });

    historyDiv.style.display = 'block';
}

// Display issuing history
function displayIssuingHistory(history) {
    const historyDiv = document.getElementById('issuingHistory');
    const historyList = document.getElementById('issuingHistoryList');

    historyList.innerHTML = '';
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-qty">${item.issued_qty} units</span>
                <span class="history-item-date">${item.issued_date}</span>
            </div>
            ${item.issued_notes ? `<div class="history-item-notes">${item.issued_notes}</div>` : ''}
        `;
        historyList.appendChild(historyItem);
    });

    historyDiv.style.display = 'block';
}

// Add receiving record
function addReceivingRecord() {
    const qty = parseInt(document.getElementById('receiving_qty').value);
    const date = document.getElementById('receiving_date').value;
    const notes = document.getElementById('receiving_notes').value;

    if (!currentProduct || !qty || qty <= 0 || !date) {
        alert('Please fill in all required fields');
        return;
    }

    const params = new URLSearchParams();
    params.append('work_order', currentProduct.work_order);
    params.append('product_id', currentProduct.product_id);
    params.append('received_qty', qty);
    params.append('received_date', date);
    params.append('received_notes', notes);

    fetch('../backend/add_receiving.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Receiving record added successfully');
                // Clear form
                document.getElementById('receiving_qty').value = '';
                document.getElementById('receiving_notes').value = '';
                // Reload product details
                loadProductDetails();
                // Reload incomplete work orders
                loadIncompleteWorkOrders();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(err => console.error('Error adding receiving:', err));
}

// Add issuing record
function addIssuingRecord() {
    const qty = parseInt(document.getElementById('issuing_qty').value);
    const date = document.getElementById('issuing_date').value;
    const notes = document.getElementById('issuing_notes').value;

    if (!currentProduct || !qty || qty <= 0 || !date) {
        alert('Please fill in all required fields');
        return;
    }

    const params = new URLSearchParams();
    params.append('work_order', currentProduct.work_order);
    params.append('product_id', currentProduct.product_id);
    params.append('issued_qty', qty);
    params.append('issued_date', date);
    params.append('issued_notes', notes);

    fetch('../backend/add_issuing.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Issuing record added successfully');
                // Clear form
                document.getElementById('issuing_qty').value = '';
                document.getElementById('issuing_notes').value = '';
                // Reload product details
                loadProductDetails();
                // Reload incomplete work orders
                loadIncompleteWorkOrders();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(err => console.error('Error adding issuing:', err));
}

// Show shortage alert
function showShortageAlert(product, shortage) {
    const alert = document.getElementById('shortageAlert');
    const content = document.getElementById('shortageAlertContent');

    content.innerHTML = `
        <strong>Work Order:</strong> ${product.work_order || 'N/A'}<br>
        <strong>Product:</strong> ${product.item || 'N/A'} (${product.colour || 'N/A'}) - ${product.size || 'N/A'}<br>
        <strong>MR Quantity:</strong> ${product.mr_qty}<br>
        <strong>Total Received + Issued:</strong> ${product.total_received + product.total_issued}<br>
        <strong>Shortage:</strong> <span style="color: #d32f2f; font-weight: bold;">${shortage} units</span>
    `;

    alert.classList.add('show');
}

// Ignore current shortage
function ignoreCurrentShortage() {
    if (!currentProduct) return;

    const params = new URLSearchParams();
    params.append('product_id', currentProduct.product_id);

    fetch('../backend/ignore_shortage.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Shortage marked as ignored');
                document.getElementById('shortageAlert').classList.remove('show');
                loadIncompleteWorkOrders();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(err => console.error('Error ignoring shortage:', err));
}

// Load incomplete work orders (with shortages)
function loadIncompleteWorkOrders() {
    fetch('../backend/get_work_with_shortage.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const incompleteList = document.getElementById('incompleteList');
                const incompleteWorkOrders = data.data.filter(order => 
                    order.hasShortage && !order.shortage_ignored
                );

                if (incompleteWorkOrders.length === 0) {
                    incompleteList.innerHTML = `
                        <div style="text-align: center; color: #999; padding: 2rem;">
                            <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: var(--success);"></i>
                            <p>All work orders are complete!</p>
                        </div>
                    `;
                    return;
                }

                incompleteList.innerHTML = '';
                incompleteWorkOrders.forEach(order => {
                    const item = document.createElement('div');
                    item.className = 'incomplete-item';
                    item.innerHTML = `
                        <div class="incomplete-item-info">
                            <div class="incomplete-item-wo">WO: ${order.work_order} - ${order.item || 'N/A'}</div>
                            <div class="incomplete-item-details">
                                <div class="incomplete-item-detail">
                                    <span class="incomplete-item-detail-label">Customer:</span>
                                    ${order.customer_name || 'N/A'}
                                </div>
                                <div class="incomplete-item-detail">
                                    <span class="incomplete-item-detail-label">MR Qty:</span>
                                    ${order.mr_qty}
                                </div>
                                <div class="incomplete-item-detail">
                                    <span class="incomplete-item-detail-label">Received:</span>
                                    ${order.total_received}
                                </div>
                                <div class="incomplete-item-detail">
                                    <span class="incomplete-item-detail-label">Issued:</span>
                                    ${order.total_issued}
                                </div>
                                <div class="incomplete-item-detail">
                                    <span class="incomplete-item-detail-label" style="color: var(--danger);">Shortage:</span>
                                    <span style="color: var(--danger); font-weight: bold;">${order.shortage}</span>
                                </div>
                            </div>
                        </div>
                        <button class="incomplete-action-btn" onclick="handleIncompleteOrder('${order.work_order}')">
                            <i class="fas fa-arrow-right"></i> Handle
                        </button>
                    `;
                    incompleteList.appendChild(item);
                });
            }
        })
        .catch(err => console.error('Error loading incomplete work orders:', err));
}

// Handle incomplete order - direct link from list
function handleIncompleteOrder(woNumber) {
    // Find the work order
    const woData = allWorkOrders.find(wo => wo.work_order === woNumber);
    if (woData) {
        selectWorkOrder(woData);
        // Smooth scroll to form
        document.getElementById('step2Container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
