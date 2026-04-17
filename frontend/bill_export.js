/**
 * Bill Print and Export Functions
 * Handles bill-only printing and XLSX export with robust library loading
 */

// XLSX Library detection and initialization
let xlsxLibraryReady = false;
let xlsxRetryCount = 0;
const MAX_XLSX_RETRIES = 5;

/**
 * Wait for XLSX library to be available
 * @returns {Promise<boolean>} True if XLSX is available
 */
async function ensureXLSXLoaded() {
    return new Promise((resolve) => {
        if (typeof XLSX !== 'undefined') {
            xlsxLibraryReady = true;
            resolve(true);
            return;
        }
        
        // Poll for XLSX library with exponential backoff
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (typeof XLSX !== 'undefined') {
                clearInterval(checkInterval);
                xlsxLibraryReady = true;
                console.log('✓ XLSX library loaded after', attempts, 'attempts');
                resolve(true);
            } else if (attempts > MAX_XLSX_RETRIES) {
                clearInterval(checkInterval);
                console.error('✗ XLSX library failed to load after', attempts, 'attempts');
                resolve(false);
            }
        }, 200 + (attempts * 100)); // Exponential backoff
    });
}

/**
 * Print Bill Only (without history sections)
 */
function printBillOnly() {
    const printableReport = document.getElementById('printableReport');
    
    // Add class to hide history sections during print
    printableReport.classList.add('bill-only-print');
    
    // Update footer note temporarily
    const notesDiv = document.querySelector('.notes');
    const origNote = notesDiv.innerHTML;
    notesDiv.innerHTML = '<strong>Bill Details:</strong> This invoice contains order and product information.';
    
    // Trigger print dialog
    setTimeout(() => {
        window.print();
        
        // Remove the class after printing
        printableReport.classList.remove('bill-only-print');
        notesDiv.innerHTML = origNote;
    }, 100);
}

/**
 * Download Bill as XLSX
 */
async function downloadBillAsXLSX() {
    try {
        // Show loading state
        const btn = event?.target;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
        }
        
        // Ensure XLSX library is loaded
        console.log('Checking XLSX library availability...');
        const xlsxReady = await ensureXLSXLoaded();
        
        if (!xlsxReady || typeof XLSX === 'undefined') {
            throw new Error(
                'Excel export library is not available. This could be due to:\n' +
                '- Network connectivity issue\n' +
                '- CDN is temporarily down\n' +
                '- Browser security policy\n\n' +
                'Please try again or contact support.'
            );
        }

        // Helper function to safely get element text
        const getElementText = (id, defaultValue = '') => {
            const elem = document.getElementById(id);
            return elem ? elem.textContent.trim() : defaultValue;
        };

        // Collect data from DOM with validation
        const woNumber = getElementText('report_wo_display');
        if (!woNumber) {
            throw new Error('Work Order not found. Please generate a report first.');
        }

        const customerName = getElementText('rpt_customer_name');
        const location = getElementText('rpt_location');
        const mrnNo = getElementText('rpt_mrn_no');
        const workDate = getElementText('rpt_work_date');
        const cutQty = getElementText('rpt_cut_qty');
        
        // Get status safely
        const statusBadge = document.getElementById('rpt_status_badge');
        const status = statusBadge ? statusBadge.textContent.trim() : 'N/A';
        
        // Get products from table
        const products = [];
        const productRows = document.querySelectorAll('#rpt_product_body tr');
        
        if (productRows.length === 0) {
            throw new Error('No products found in the report. Please generate a valid report first.');
        }
        
        productRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) {
                try {
                    products.push({
                        'Item': cells[0].textContent.split('\n')[0].trim(),
                        'Code': cells[0].querySelector('small')?.textContent.replace('Code: ', '').trim() || '',
                        'Colour/Size': cells[1].textContent.trim(),
                        'MR Qty': cells[2].textContent.trim(),
                        'Received': cells[3].textContent.trim(),
                        'Issued': cells[4].textContent.trim(),
                        'Balance': cells[5].textContent.trim()
                    });
                } catch (e) {
                    console.warn('Warning: Could not parse product row:', e);
                }
            }
        });

        if (products.length === 0) {
            throw new Error('Could not extract product data. Please refresh and try again.');
        }
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Bill Summary
        const summaryData = [
            ['CLOTHING SYSTEM - WORK ORDER BILL'],
            [],
            ['Work Order:', woNumber],
            ['Customer:', customerName],
            ['Location:', location],
            ['MRN No:', mrnNo],
            ['Work Date:', workDate],
            ['Cut Qty:', cutQty],
            ['Status:', status],
            [],
            ['PRODUCTS']
        ];
        
        // Add product headers and data
        const productHeaders = ['Item', 'Code', 'Colour/Size', 'MR Qty', 'Received', 'Issued', 'Balance'];
        summaryData.push(productHeaders);
        
        products.forEach(product => {
            summaryData.push([
                product.Item,
                product.Code,
                product['Colour/Size'],
                product['MR Qty'],
                product.Received,
                product.Issued,
                product.Balance
            ]);
        });
        
        // Create sheet and add data
        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, // Item
            { wch: 12 }, // Code
            { wch: 15 }, // Colour/Size
            { wch: 10 }, // MR Qty
            { wch: 10 }, // Received
            { wch: 10 }, // Issued
            { wch: 10 }  // Balance
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Bill');
        
        // Sheet 2: Detailed Product List
        const detailedProducts = [
            ['Item', 'Code', 'Colour', 'Size', 'MR Qty', 'Received', 'Issued', 'Balance']
        ];
        
        products.forEach(product => {
            const colorSize = product['Colour/Size'].split('/');
            detailedProducts.push([
                product.Item,
                product.Code,
                colorSize[0] ? colorSize[0].trim() : '',
                colorSize[1] ? colorSize[1].trim() : '',
                product['MR Qty'],
                product.Received,
                product.Issued,
                product.Balance
            ]);
        });
        
        const ws2 = XLSX.utils.aoa_to_sheet(detailedProducts);
        ws2['!cols'] = [
            { wch: 20 },
            { wch: 12 },
            { wch: 15 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws2, 'Products');
        
        // Generate filename
        const date = new Date().toISOString().split('T')[0];
        const filename = `Bill_${woNumber}_${date}.xlsx`;
        
        // Write file
        XLSX.writeFile(wb, filename);
        
        console.log(`✓ Successfully exported: ${filename}`);
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-file-excel"></i> Download XLSX';
        }
        
    } catch (error) {
        console.error('Error during XLSX download:', error);
        
        // Restore button state
        const btn = event?.target;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-file-excel"></i> Download XLSX';
        }
        
        alert('Error downloading file:\n\n' + error.message + '\n\nPlease check the browser console (F12) for more details.');
    }
}
