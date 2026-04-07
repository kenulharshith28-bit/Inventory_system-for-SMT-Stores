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

/**
 * Format date from database (YYYY-MM-DD) to readable format
 */
function formatDate(dateStr) {
    if (!dateStr || dateStr === '0000-00-00' || dateStr === '0000-00-00 00:00:00') {
        return '<small style="color:#cbd5e1">No date</small>';
    }
    try {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

// Display receiving history
function displayReceivingHistory(history) {
    const historyDiv = document.getElementById('receivingHistory');
    const historyList = document.getElementById('receivingHistoryList');

    historyList.innerHTML = `
        <div style="
            display: grid;
            grid-template-columns: 100px 1fr 130px;
            gap: 1rem;
            padding: 0.75rem 1rem;
            font-weight: 600;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
            border-radius: 8px 8px 0 0;
        ">
            <span>Count</span>
            <span>Note</span>
            <span style="text-align:right;">Date</span>
        </div>
    `;

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.style.cssText = `
            display: grid;
            grid-template-columns: 100px 1fr 130px;
            gap: 1rem;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f1f5f9;
            align-items: center;
        `;

        const noteText = item.received_notes && item.received_notes.trim() 
            ? item.received_notes 
            : '<small style="color:#cbd5e1">No note</small>';
        const dateText = formatDate(item.received_date);

        historyItem.innerHTML = `
            <span style="font-weight: 600; color: #0f172a;">
                ${item.received_qty} units
            </span>
            <span style="color: #64748b; font-size: 0.9rem;">
                ${noteText}
            </span>
            <span style="text-align: right; color: #94a3b8; font-size: 0.85rem;">
                ${dateText}
            </span>
        `;

        historyList.appendChild(historyItem);
    });

    historyDiv.style.display = 'block';
}

// Display issuing history
function displayIssuingHistory(history) {
    const historyDiv = document.getElementById('issuingHistory');
    const historyList = document.getElementById('issuingHistoryList');

    historyList.innerHTML = `
        <div style="
            display: grid;
            grid-template-columns: 100px 1fr 130px;
            gap: 1rem;
            padding: 0.75rem 1rem;
            font-weight: 600;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
            border-radius: 8px 8px 0 0;
        ">
            <span>Count</span>
            <span>Note</span>
            <span style="text-align:right;">Date</span>
        </div>
    `;

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.style.cssText = `
            display: grid;
            grid-template-columns: 100px 1fr 130px;
            gap: 1rem;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f1f5f9;
            align-items: center;
        `;

        const noteText = item.issued_notes && item.issued_notes.trim() 
            ? item.issued_notes 
            : '<small style="color:#cbd5e1">No note</small>';
        const dateText = formatDate(item.issued_date);

        historyItem.innerHTML = `
            <span style="font-weight: 600; color: #0f172a;">
                ${item.issued_qty} units
            </span>
            <span style="color: #64748b; font-size: 0.9rem;">
                ${noteText}
            </span>
            <span style="text-align: right; color: #94a3b8; font-size: 0.85rem;">
                ${dateText}
            </span>
        `;

        historyList.appendChild(historyItem);
    });

    historyDiv.style.display = 'block';
}

/**
 * Show professional notification
 */
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: notify-in 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        word-wrap: break-word;
        font-family: 'Poppins', sans-serif;
    `;

    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        notification.style.color = 'white';
        notification.style.borderLeft = '4px solid #047857';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        notification.style.color = 'white';
        notification.style.borderLeft = '4px solid #991b1b';
    } else if (type === 'warning') {
        notification.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        notification.style.color = 'white';
        notification.style.borderLeft = '4px solid #b45309';
    } else {
        notification.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
        notification.style.color = 'white';
        notification.style.borderLeft = '4px solid #1e40af';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'notify-out 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3500);
}

// Add CSS for notifications if not already added
if (!document.querySelector('style[data-notify-css]')) {
    const style = document.createElement('style');
    style.setAttribute('data-notify-css', 'true');
    style.textContent = `
        @keyframes notify-in {
            from { opacity: 0; transform: translateX(400px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes notify-out {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(400px); }
        }
    `;
    document.head.appendChild(style);
}

// Add receiving record
function addReceivingRecord(isForced = false) {
    const qty = parseInt(document.getElementById('receiving_qty').value) || 0;
    const date = document.getElementById('receiving_date').value;
    const notes = document.getElementById('receiving_notes').value.trim();

    // Validation
    if (!currentProduct || !currentProduct.product_id) {
        showNotification('error', '✗ Please select a product first');
        return;
    }

    if (!qty || qty <= 0) {
        showNotification('error', '✗ Please enter a valid quantity');
        return;
    }

    if (!date) {
        showNotification('error', '✗ Please select a date');
        return;
    }

    const btn = document.querySelector('button[onclick^="addReceivingRecord"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    const params = new URLSearchParams();
    params.append('work_order', currentProduct.work_order);
    params.append('product_id', currentProduct.product_id);
    params.append('received_qty', qty);
    params.append('received_date', date);
    params.append('received_notes', notes);
    if (isForced) params.append('force', 'true');

    fetch('../backend/add_receiving.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })
        .then(res => res.json())
        .then(data => {
            btn.disabled = false;
            btn.innerHTML = originalText;

            if (data.success) {
                showNotification('success', '✓ Receiving record added successfully!');
                
                // Clear form
                document.getElementById('receiving_qty').value = '';
                document.getElementById('receiving_notes').value = '';
                document.getElementById('receiving_date').value = new Date().toISOString().split('T')[0];
                
                // Reload product details
                setTimeout(() => loadProductDetails(), 300);
                
                // Reload incomplete work orders
                loadIncompleteWorkOrders();
            } else if (data.error === 'OVER_LIMIT') {
                if (confirm(data.message + "\n\nDo you want to proceed anyway?")) {
                    addReceivingRecord(true); // Recursive call with force=true
                }
            } else {
                showNotification('error', '✗ ' + (data.error || 'Failed to add receiving record'));
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.innerHTML = originalText;
            console.error('Error adding receiving:', err);
            showNotification('error', '✗ Network error: ' + err.message);
        });
}

// Add issuing record
function addIssuingRecord() {
    const qty = parseInt(document.getElementById('issuing_qty').value) || 0;
    const date = document.getElementById('issuing_date').value;
    const notes = document.getElementById('issuing_notes').value.trim();

    // Validation
    if (!currentProduct || !currentProduct.product_id) {
        showNotification('error', '✗ Please select a product first');
        return;
    }

    if (!qty || qty <= 0) {
        showNotification('error', '✗ Please enter a valid quantity');
        return;
    }

    if (!date) {
        showNotification('error', '✗ Please select a date');
        return;
    }

    const btn = document.querySelector('button[onclick^="addIssuingRecord"]');
    const originalText = btn ? btn.innerHTML : 'Issue Items';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
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
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }

            if (data.success) {
                // Check if there's a warning about insufficient stock
                if (data.warning) {
                    showNotification('warning', '⚠ ' + data.warning_message);
                } else {
                    showNotification('success', '✓ Issuing record added successfully!');
                }
                
                // Clear form
                document.getElementById('issuing_qty').value = '';
                document.getElementById('issuing_notes').value = '';
                document.getElementById('issuing_date').value = new Date().toISOString().split('T')[0];
                
                // Reload product details
                setTimeout(() => loadProductDetails(), 300);
                
                // Reload incomplete work orders
                loadIncompleteWorkOrders();
            } else {
                showNotification('error', '✗ ' + (data.error || 'Failed to add issuing record'));
            }
        })
        .catch(err => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            console.error('Error adding issuing:', err);
            showNotification('error', '✗ Network error: ' + err.message);
        });
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
