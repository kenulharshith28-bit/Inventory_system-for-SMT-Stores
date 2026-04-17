/**
 * Multiple Products Management
 * Handles adding multiple products to a work order
 */

// Global array to store products before submission
let productsQueue = [];

/**
 * Handle Enter key navigation between fields
 */
function handleEnterKey(event, nextFieldId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const nextField = document.getElementById(nextFieldId);
        if (nextField) {
            nextField.focus();
        }
    }
}

/**
 * Handle Enter key on last product field (mr_qty) - add product to list
 */
function handleProductEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addProductToList();
    }
}

/**
 * Update live preview of work order header
 */
function updateWorkOrderPreview() {
    const customerName = document.getElementById('name').value || '—';
    const workOrder = document.getElementById('work_order').value || '—';
    const status = document.getElementById('status').value || 'created';
    
    document.getElementById('previewCustomer').textContent = customerName;
    document.getElementById('previewWorkOrder').textContent = workOrder;
    document.getElementById('previewStatus').textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Render products preview panel in real-time
 */
function renderProductsPreview() {
    const container = document.getElementById('previewProductsContainer');
    const counter = document.getElementById('previewCounter');
    
    counter.textContent = productsQueue.length + ' product' + (productsQueue.length !== 1 ? 's' : '');
    
    if (productsQueue.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-plus-circle"></i>
                <p>No products added yet</p>
                <small>Add products using the form on the left</small>
            </div>
        `;
        return;
    }

    container.innerHTML = productsQueue.map((product, idx) => `
        <div class="product-preview-item">
            <div class="preview-item-header">
                <span class="preview-item-name">${product.item}</span>
                <span class="preview-item-qty">${product.mr_qty} ${product.unit}</span>
            </div>
            <div class="preview-item-details">
                <div class="preview-detail">
                    <span class="preview-detail-label">Code:</span>
                    <span class="preview-detail-value">${product.item_code || '—'}</span>
                </div>
                <div class="preview-detail">
                    <span class="preview-detail-label">Colour:</span>
                    <span class="preview-detail-value">${product.colour || '—'}</span>
                </div>
                <div class="preview-detail">
                    <span class="preview-detail-label">Size:</span>
                    <span class="preview-detail-value">${product.size || '—'}</span>
                </div>
                <div class="preview-detail">
                    <span class="preview-detail-label">Unit:</span>
                    <span class="preview-detail-value">${product.unit || 'Pcs'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Toggle between single product form and bulk JSON input
 */
function toggleBulkView() {
    const productForm = document.querySelector('.product-form');
    const bulkView = document.getElementById('bulkInputView');
    
    if (bulkView.style.display === 'none') {
        productForm.style.display = 'none';
        bulkView.style.display = 'block';
    } else {
        productForm.style.display = 'block';
        bulkView.style.display = 'none';
        document.getElementById('bulkJsonInput').value = '';
    }
}

/**
 * Add a single product to the queue
 */
function addProductToList() {
    const product = {
        item: document.getElementById('item').value.trim(),
        item_code: document.getElementById('item_code').value.trim(),
        colour: document.getElementById('colour').value.trim(),
        size: document.getElementById('size').value.trim(),
        unit: document.getElementById('unit').value.trim() || 'Pcs',
        mr_qty: parseInt(document.getElementById('mr_qty').value) || 0
    };

    // Validate required fields
    if (!product.item) {
        alert('Please select an Item');
        return;
    }

    // Check for duplicates in queue
    const isDuplicate = productsQueue.some(p =>
        p.item_code === product.item_code &&
        p.colour === product.colour &&
        p.size === product.size &&
        p.unit === product.unit &&
        p.mr_qty === product.mr_qty
    );

    if (isDuplicate) {
        alert('This product (with these details) is already in the list');
        return;
    }

    // Add to queue
    productsQueue.push(product);

    // Clear form
    document.getElementById('item_code').value = '';
    document.getElementById('item').value = '';
    document.getElementById('colour').value = '';
    document.getElementById('size').value = '';
    document.getElementById('unit').value = 'Pcs';
    document.getElementById('mr_qty').value = '';

    // Show products list and update preview
    renderProductsList();
    renderProductsPreview();
    document.getElementById('productsList').style.display = 'block';
    
    // Focus back to item_code for rapid entry
    document.getElementById('item_code').focus();
}

/**
 * Remove a product from the queue by index
 */
function removeProductFromList(index) {
    if (index >= 0 && index < productsQueue.length) {
        productsQueue.splice(index, 1);
        renderProductsList();
        renderProductsPreview();
        
        if (productsQueue.length === 0) {
            document.getElementById('productsList').style.display = 'none';
        }
    }
}

/**
 * Render the products list table
 */
function renderProductsList() {
    const tbody = document.getElementById('productsTableBody');
    const countSpan = document.getElementById('bulletproductCount');
    
    tbody.innerHTML = '';
    countSpan.textContent = productsQueue.length;

    if (productsQueue.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 1rem; color: #999;">No products added yet</td></tr>';
        return;
    }

    productsQueue.forEach((product, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${product.item}</strong></td>
            <td style="font-family: monospace;">${product.item_code || '-'}</td>
            <td>${product.colour || '-'}</td>
            <td>${product.size || '-'}</td>
            <td>${product.unit}</td>
            <td style="text-align: center;"><strong>${product.mr_qty}</strong></td>
            <td>
                <button class="product-delete-btn" type="button" onclick="removeProductFromList(${index})">
                    <i class="fas fa-trash-alt"></i> Remove
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Parse JSON and add products in bulk
 */
function parseAndAddBulkProducts() {
    const jsonInput = document.getElementById('bulkJsonInput').value.trim();
    
    if (!jsonInput) {
        alert('Please paste some JSON');
        return;
    }

    try {
        const products = JSON.parse(jsonInput);
        
        if (!Array.isArray(products)) {
            alert('JSON must be an array of products');
            return;
        }

        if (products.length === 0) {
            alert('JSON array is empty');
            return;
        }

        let addedCount = 0;
        let errors = [];

        products.forEach((product, idx) => {
            const p = {
                item: (product.item || '').trim(),
                item_code: (product.item_code || '').trim(),
                colour: (product.colour || '').trim(),
                size: (product.size || '').trim(),
                unit: (product.unit || 'Pcs').trim(),
                mr_qty: parseInt(product.mr_qty) || 0
            };

            // Validate required fields
            if (!p.item) {
                errors.push(`Row ${idx + 1}: Item is required`);
                return;
            }

            // Check for duplicates in queue
            const isDuplicate = productsQueue.some(existing =>
                existing.item_code === p.item_code &&
                existing.colour === p.colour &&
                existing.size === p.size &&
                existing.unit === p.unit &&
                existing.mr_qty === p.mr_qty
            );

            if (isDuplicate) {
                errors.push(`Row ${idx + 1}: Duplicate product (already in list)`);
                return;
            }

            // Add to queue
            productsQueue.push(p);
            addedCount++;
        });

        // Show results
        let message = `Added ${addedCount} product(s)`;
        if (errors.length > 0) {
            message += `\n\nErrors:\n${errors.join('\n')}`;
        }

        alert(message);

        if (addedCount > 0) {
            renderProductsList();
            renderProductsPreview();
            document.getElementById('productsList').style.display = 'block';
            toggleBulkView(); // Switch back to single form
            document.getElementById('bulkJsonInput').value = '';
        }

    } catch (e) {
        alert('Invalid JSON format. Please check your syntax.\n\nError: ' + e.message);
    }
}

/**
 * Create work order with all products from queue
 */
function addWorkWithProducts() {
    const customerName = document.getElementById('name').value.trim();
    const workOrder = document.getElementById('work_order').value.trim();

    // Validate work order header fields
    if (!customerName) {
        alert('Please select a Customer Name');
        return;
    }

    if (!workOrder) {
        alert('Please enter a Work Order number');
        return;
    }

    // If no products in queue, ask user if they want to continue
    if (productsQueue.length === 0) {
        const proceed = confirm('No products added. Do you want to create work order without products?');
        if (!proceed) return;
    }

    // First, create the work order (without initial product if queue is populated)
    const headerParams = new URLSearchParams();
    headerParams.append('customer_name', customerName);
    headerParams.append('work_order', workOrder);
    headerParams.append('mrn_no', document.getElementById('mrn_no').value);
    headerParams.append('cut_qty', document.getElementById('cut_qty').value);
    headerParams.append('location', document.getElementById('location').value);
    headerParams.append('work_date', document.getElementById('work_date').value);
    headerParams.append('status', document.getElementById('status').value);
    // Don't include product fields when we have queued products
    if (productsQueue.length === 0) {
        headerParams.append('item', document.getElementById('item').value);
        headerParams.append('item_code', document.getElementById('item_code').value);
        headerParams.append('colour', document.getElementById('colour').value);
        headerParams.append('size', document.getElementById('size').value);
        headerParams.append('unit', document.getElementById('unit').value);
        headerParams.append('mr_qty', document.getElementById('mr_qty').value);
    }

    // Create the work order
    fetch('../backend/add_work.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: headerParams.toString()
    })
        .then(res => res.text())
        .then(data => {
            if (data.trim() === 'added') {
                // Work order created successfully
                
                // If products exist, add them in bulk
                if (productsQueue.length > 0) {
                    const bulkData = {
                        work_order: workOrder,
                        products: productsQueue
                    };

                    return fetch('../backend/add_multiple_products.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(bulkData)
                    })
                    .then(res => res.json())
                    .then(bulkResponse => {
                        // Show result
                        let resultMsg = `✓ Work Order "${workOrder}" created successfully!\n`;
                        resultMsg += `✓ Added ${bulkResponse.products_added} product(s)`;
                        
                        if (bulkResponse.failures && bulkResponse.failures.length > 0) {
                            resultMsg += `\n⚠ ${bulkResponse.failures.length} product(s) failed:\n`;
                            bulkResponse.failures.forEach(f => {
                                resultMsg += `  - ${f.item || 'Item ' + f.index}: ${f.error}\n`;
                            });
                        }
                        
                        alert(resultMsg);

                        // Clear forms and reload
                        clearAllForms();
                        loadMasterData();
                        loadTable();
                    });
                } else {
                    alert('✓ Work order successfully created!');
                    clearAllForms();
                    loadMasterData();
                    loadTable();
                }
            } else {
                alert('Error creating work order: ' + data);
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Connection error: ' + err.message);
        });
}

/**
 * Clear all forms and reset state
 */
function clearAllForms() {
    // Clear header fields
    document.getElementById('name').value = '';
    document.getElementById('work_order').value = '';
    document.getElementById('mrn_no').value = '';
    document.getElementById('cut_qty').value = '';
    document.getElementById('location').value = '';
    document.getElementById('work_date').value = toLocalDateString(new Date());
    document.getElementById('status').value = 'created';
    
    // Clear single product form
    document.getElementById('item_code').value = '';
    document.getElementById('item').value = '';
    document.getElementById('colour').value = '';
    document.getElementById('size').value = '';
    document.getElementById('unit').value = 'Pcs';
    document.getElementById('mr_qty').value = '';
    
    // Clear bulk input
    document.getElementById('bulkJsonInput').value = '';
    
    // Clear products queue
    productsQueue = [];
    document.getElementById('productsList').style.display = 'none';
    renderProductsList();
    renderProductsPreview();
    updateWorkOrderPreview();
    
    // Reset views to single product form
    document.querySelector('.product-form').style.display = 'block';
    document.getElementById('bulkInputView').style.display = 'none';
}

// Initialize preview updates on field changes
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('name')) {
        // Add event listeners for real-time preview updates
        document.getElementById('name').addEventListener('change', updateWorkOrderPreview);
        document.getElementById('work_order').addEventListener('input', updateWorkOrderPreview);
        document.getElementById('status').addEventListener('change', updateWorkOrderPreview);
    }
});

