document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!checkAuth()) return;
    
    try {
        // Initialize excel stock page
        await initExcelStockPage();
    } catch (error) {
        console.error('Error initializing excel stock page:', error);
        showNotification('Error loading stock data', 'danger');
    }
});

// Global variables
let hot; // Handsontable instance
let productsData = []; // Products data from the server
let stockData = []; // Stock data from the server
let hasUnsavedChanges = false;
let username = ''; // Current user's username
let activityLog = [];
let selectedCell = null;
let excelDbName = 'excel_stock_db'; // Name for localStorage
let fullStockTransactions = []; // Store all stock transactions for filtering
let customColumns = []; // Store custom columns

// Initialize excel stock page
async function initExcelStockPage() {
    // Get current user's username
    const currentUser = await getCurrentUser();
    username = currentUser ? currentUser.username : 'Anonymous';
    
    // Initialize localStorage db if not exists
    initializeLocalDb();
    
    // Load products data
    await loadProductsData();
    
    // Load stock data
    await loadStockData();
    
    // Initialize Handsontable
    initializeHandsontable();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load activity logs
    await loadActivityLogs();
    
    // Update stats
    updateStats();
    
    // Initialize date filters
    initializeDateFilters();
    
    // Show notification that this is a separate database
    showNotification('Excel Stock is using a separate database and will not affect the main inventory', 'info', 10000);
}

// Initialize local database
function initializeLocalDb() {
    // Check if local db exists
    if (!localStorage.getItem(`${excelDbName}_products`)) {
        localStorage.setItem(`${excelDbName}_products`, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(`${excelDbName}_stock`)) {
        localStorage.setItem(`${excelDbName}_stock`, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(`${excelDbName}_activity`)) {
        localStorage.setItem(`${excelDbName}_activity`, JSON.stringify([]));
    }
}

// Load products data
async function loadProductsData() {
    try {
        // First, get the real products from server to bootstrap the excel db
        const serverProducts = await getProducts();
        
        // Get products from local storage
        let localProducts = JSON.parse(localStorage.getItem(`${excelDbName}_products`) || '[]');
        
        // If local storage is empty, initialize with server products
        if (localProducts.length === 0 && serverProducts.length > 0) {
            localProducts = serverProducts.map(p => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                type: p.type,
                price: p.price,
                quantity: 0, // Initialize at 0 since this is a separate DB
                location: p.location || '',
                min_stock_level: p.min_stock_level || 5
            }));
            
            // Save to local storage
            localStorage.setItem(`${excelDbName}_products`, JSON.stringify(localProducts));
        }
        
        productsData = localProducts;
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products data', 'danger');
    }
}

// Load stock data
async function loadStockData() {
    try {
        // Get stock transactions from local storage
        fullStockTransactions = JSON.parse(localStorage.getItem(`${excelDbName}_stock`) || '[]');
        
        // Sort transactions by timestamp
        fullStockTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Convert to format suitable for the spreadsheet
        stockData = convertStockTransactionsToSpreadsheetFormat(fullStockTransactions);
    } catch (error) {
        console.error('Error loading stock data:', error);
        showNotification('Error loading stock data', 'danger');
    }
}

// Convert stock transactions to spreadsheet format
function convertStockTransactionsToSpreadsheetFormat(stockTransactions) {
    const spreadsheetData = [];
    
    // Create a map to track products and their total quantities
    const productMap = new Map();
    
    // Initialize with all products at 0 quantity
    productsData.forEach(product => {
        productMap.set(product.id, {
            id: product.id,
            name: product.name,
            sku: product.sku,
            type: product.type,
            quantity: 0,
            price: product.price,
            location: product.location || '',
            wastage: 0,
            notes: ''
        });
    });
    
    // Process stock transactions to calculate current quantities
    stockTransactions.forEach(transaction => {
        const productId = transaction.product;
        const quantity = transaction.type === 'IN' ? transaction.quantity : -transaction.quantity;
        
        if (productMap.has(productId)) {
            const product = productMap.get(productId);
            
            // Update quantity
            product.quantity += quantity;
            
            // Update wastage if applicable
            if (transaction.is_wastage) {
                product.wastage += transaction.quantity;
            }
            
            // Update notes with the most recent transaction note
            if (transaction.notes) {
                product.notes = transaction.notes;
            }
            
            productMap.set(productId, product);
        }
    });
    
    // Convert map to array
    productMap.forEach(product => {
        spreadsheetData.push(product);
    });
    
    return spreadsheetData;
}

// Initialize Handsontable
function initializeHandsontable() {
    const container = document.getElementById('stockSpreadsheet');
    
    // Define column headers
    const columns = [
        { data: 'id', title: 'ID', readOnly: true, width: 60 },
        { data: 'name', title: 'Product Name', width: 180 },
        { data: 'sku', title: 'SKU', width: 100 },
        { 
            data: 'type', 
            title: 'Type', 
            width: 100,
            type: 'dropdown',
            source: ['Raw Material', 'Finished Product', 'Packaging', 'Spice', 'Fruits', 'Home Decor', 'Cookware', 'Bakery Ingredients']
        },
        { data: 'quantity', title: 'Current Stock', type: 'numeric', width: 120 },
        { data: 'wastage', title: 'Wastage', type: 'numeric', width: 100 },
        { data: 'price', title: 'Unit Price', type: 'numeric', numericFormat: { pattern: '0,0.00' }, width: 120 },
        { data: 'location', title: 'Location', width: 120 },
        { data: 'notes', title: 'Notes', width: 200 }
    ];
    
    // Initialize Handsontable
    hot = new Handsontable(container, {
        data: stockData,
        columns: columns,
        colHeaders: columns.map(col => col.title),
        rowHeaders: true,
        height: 'auto',
        width: '100%',
        licenseKey: 'non-commercial-and-evaluation',
        stretchH: 'all',
        autoWrapRow: true,
        manualRowResize: true,
        manualColumnResize: true,
        contextMenu: true,
        filters: true,
        dropdownMenu: true,
        afterChange: function(changes, source) {
            console.log('Cell changed:', changes, 'Source:', source);
            if (source !== 'loadData') {
                hasUnsavedChanges = true;
                
                // Auto-save changes to localStorage with a slight delay
                // to allow multiple changes to be batched
                clearTimeout(window.autoSaveTimeout);
                window.autoSaveTimeout = setTimeout(() => {
                    autoSaveChanges();
                }, 500);
                
                // Update stats after each change
                updateStats();
            }
        },
        afterOnCellMouseDown: (event, coords, TD) => {
            selectedCell = coords;
        },
        afterSelection: (row, column, row2, column2, preventScrolling) => {
            selectedCell = { row, col: column };
        },
        afterRemoveRow: function(index, amount) {
            console.log('Row removed:', index, amount);
            hasUnsavedChanges = true;
            // Immediate save for row deletions
            autoSaveChanges();
            updateStats();
        },
        afterCreateRow: function(index, amount) {
            console.log('Row added:', index, amount);
            hasUnsavedChanges = true;
            // Immediate save for row additions
            autoSaveChanges();
            updateStats();
        },
        afterPaste: function(data, coords) {
            console.log('Data pasted:', data, coords);
            hasUnsavedChanges = true;
            autoSaveChanges();
            updateStats();
        },
        afterCut: function(data, coords) {
            console.log('Data cut:', data, coords);
            hasUnsavedChanges = true;
            autoSaveChanges();
            updateStats();
        }
    });
    
    // Add debug listener for any input in the table
    container.addEventListener('keyup', function(event) {
        console.log('Keyup event in table:', event.key);
    });
}

// Auto-save changes to localStorage
function autoSaveChanges() {
    try {
        console.log('Auto-saving changes...');
        
        // Get current data from the table
        const currentData = hot.getData();
        const headers = hot.getColHeader();
        
        if (!currentData || !headers) {
            console.error('No data or headers available for auto-save');
            return false;
        }
        
        // Convert to object format with property names
        const formattedData = currentData.map(row => {
            if (!row || row.length === 0) return null;
            
            const obj = {};
            headers.forEach((header, index) => {
                if (header) {
                    const key = getKeyFromHeader(header);
                    obj[key] = row[index];
                }
            });
            
            // Filter out rows without product name or with empty product name
            if (!obj.name || obj.name.toString().trim() === '') {
                return null;
            }
            return obj;
        }).filter(Boolean); // Remove null entries
        
        console.log('Formatted data for save:', formattedData);
        
        // Get existing transactions from localStorage
        const existingTransactions = JSON.parse(localStorage.getItem(`${excelDbName}_stock`) || '[]');
        
        // Create a temporary backup of the current state
        localStorage.setItem(`${excelDbName}_stock_backup`, JSON.stringify(existingTransactions));
        
        // Get existing products from localStorage
        let existingProducts = JSON.parse(localStorage.getItem(`${excelDbName}_products`) || '[]');
        
        // Track modified products for updated quantities
        const modifiedProducts = new Map();
        
        // Update products with changes or add new ones
        formattedData.forEach(item => {
            // Check if this is an existing product
            const existingProductIndex = existingProducts.findIndex(p => p.id == item.id);
            
            if (existingProductIndex >= 0) {
                // Get the existing product
                const existingProduct = existingProducts[existingProductIndex];
                
                // Check if quantity has changed
                if (parseInt(existingProduct.quantity) !== parseInt(item.quantity)) {
                    modifiedProducts.set(existingProduct.id, {
                        oldQuantity: parseInt(existingProduct.quantity) || 0,
                        newQuantity: parseInt(item.quantity) || 0,
                        product: existingProduct
                    });
                }
                
                // Update existing product details
                existingProducts[existingProductIndex] = {
                    ...existingProduct,
                    name: item.name || existingProduct.name,
                    sku: item.sku || existingProduct.sku,
                    type: item.type || existingProduct.type,
                    price: parseFloat(item.price) || existingProduct.price,
                    quantity: parseInt(item.quantity) || existingProduct.quantity,
                    location: item.location || existingProduct.location
                };
            } else if (item.name && item.name.toString().trim() !== '') {
                // This is a new product without an ID
                const newId = existingProducts.length > 0 ? 
                    Math.max(...existingProducts.map(p => parseInt(p.id) || 0)) + 1 : 1;
                
                console.log('Creating new product with ID:', newId);
                
                // Add as new product
                const newProduct = {
                    id: newId,
                    name: item.name,
                    sku: item.sku || `SKU-${newId}`,
                    type: item.type || 'Raw Material',
                    price: parseFloat(item.price) || 0,
                    quantity: parseInt(item.quantity) || 0,
                    location: item.location || '',
                    min_stock_level: 5
                };
                
                existingProducts.push(newProduct);
                
                // If quantity > 0, add initial stock transaction
                if (parseInt(item.quantity) > 0) {
                    existingTransactions.push({
                        product: newId,
                        quantity: parseInt(item.quantity),
                        type: 'IN',
                        notes: `Initial stock: ${item.notes || ''}`,
                        reference_number: `INIT-${new Date().getTime()}`,
                        timestamp: new Date().toISOString(),
                        user: username,
                        unit_price: parseFloat(item.price) || 0,
                        is_wastage: false
                    });
                }
                
                // Update the ID in the table
                const rowIndex = currentData.findIndex(row => 
                    row[1] === item.name && 
                    (row[2] === item.sku || row[2] === null || row[2] === undefined || row[2] === ''));
                    
                if (rowIndex >= 0) {
                    console.log('Updating ID in table for row:', rowIndex, 'New ID:', newId);
                    hot.setDataAtCell(rowIndex, 0, newId, 'auto-save');
                }
            }
        });
        
        // Create transactions for quantity changes
        modifiedProducts.forEach((changeInfo, productId) => {
            const quantityDiff = changeInfo.newQuantity - changeInfo.oldQuantity;
            
            if (quantityDiff !== 0) {
                // Create a stock transaction
                existingTransactions.push({
                    product: productId,
                    quantity: Math.abs(quantityDiff),
                    type: quantityDiff > 0 ? 'IN' : 'OUT',
                    notes: `Auto-save quantity adjustment`,
                    reference_number: `ADJ-${new Date().getTime()}`,
                    timestamp: new Date().toISOString(),
                    user: username,
                    unit_price: parseFloat(changeInfo.product.price) || 0,
                    is_wastage: false
                });
            }
        });
        
        // Save products back to localStorage
        localStorage.setItem(`${excelDbName}_products`, JSON.stringify(existingProducts));
        
        // Save transactions back to localStorage
        localStorage.setItem(`${excelDbName}_stock`, JSON.stringify(existingTransactions));
        
        // Update global variables
        productsData = existingProducts;
        fullStockTransactions = existingTransactions;
        
        // Record auto-save activity if changes were made
        if (modifiedProducts.size > 0 || existingProducts.length !== productsData.length) {
            recordActivity('Auto-Save', `Auto-saved ${formattedData.length} items with ${modifiedProducts.size} quantity changes`);
            console.log('Auto-save complete with changes detected');
            // Show notification only for significant changes
            showNotification('Changes saved automatically', 'success', 2000);
        } else {
            console.log('Auto-save complete (no significant changes)');
        }
        
        return true;
    } catch (error) {
        console.error('Error in auto-save:', error);
        showNotification('Error saving changes automatically', 'danger');
        return false;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Save button - removed from UI but keeping function for future use
    if (document.getElementById('saveBtn')) {
        document.getElementById('saveBtn').addEventListener('click', saveChanges);
    }
    
    // Add row button
    document.getElementById('addRowBtn').addEventListener('click', function() {
        addNewEmptyRow();
    });
    
    // Remove row button - removed from UI but keeping function for future use
    if (document.getElementById('removeRowBtn')) {
        document.getElementById('removeRowBtn').addEventListener('click', function() {
            const selected = hot.getSelected();
            if (selected) {
                const startRow = selected[0][0];
                const endRow = selected[0][2];
                const numRows = endRow - startRow + 1;
                
                if (confirm(`Are you sure you want to remove ${numRows} row(s)?`)) {
                    hot.alter('remove_row', startRow, numRows);
                    hasUnsavedChanges = true;
                    autoSaveChanges();
                    updateStats();
                }
            } else {
                showNotification('Please select a row to remove', 'warning');
            }
        });
    }
    
    // Manual save button
    document.getElementById('manualSaveBtn').addEventListener('click', function() {
        console.log('Manual save button clicked');
        autoSaveChanges();
        showNotification('Manual save completed', 'success');
    });
    
    // Add column button
    document.getElementById('addColumnBtn').addEventListener('click', function() {
        showAddColumnModal();
    });
    
    // Manage columns button
    document.getElementById('manageColumnsBtn').addEventListener('click', function() {
        showManageColumnsModal();
    });
    
    // Import buttons
    document.getElementById('importCsvBtn').addEventListener('click', () => {
        const importModal = new bootstrap.Modal(document.getElementById('importModal'));
        importModal.show();
    });
    
    document.getElementById('importExcelBtn').addEventListener('click', () => {
        const importModal = new bootstrap.Modal(document.getElementById('importModal'));
        importModal.show();
    });
    
    document.getElementById('importTemplateBtn').addEventListener('click', downloadTemplate);
    
    // Export buttons
    document.getElementById('exportCsvBtn').addEventListener('click', () => exportData('csv'));
    document.getElementById('exportExcelBtn').addEventListener('click', () => exportData('excel'));
    document.getElementById('exportPdfBtn').addEventListener('click', () => exportData('pdf'));
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', function() {
        const searchQuery = this.value.toLowerCase();
        
        if (searchQuery) {
            hot.getPlugin('search').query(searchQuery);
            hot.render();
        } else {
            hot.getPlugin('search').query('');
            hot.render();
        }
    });
    
    // Clear search button
    document.getElementById('clearSearchBtn').addEventListener('click', function() {
        document.getElementById('searchInput').value = '';
        hot.getPlugin('search').query('');
        hot.render();
    });
    
    // Confirm import button
    document.getElementById('confirmImport').addEventListener('click', importData);
    
    // Before unload event to warn about unsaved changes
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
    
    // Manual edit modal
    document.getElementById('saveCellValueBtn').addEventListener('click', saveManualEdit);
    
    // Context menu event to open manual edit modal
    hot.addHook('afterContextMenuShow', function() {
        const contextMenu = document.querySelector('.htContextMenu');
        if (contextMenu) {
            // Add a new option to the context menu
            const editMenuItem = document.createElement('div');
            editMenuItem.className = 'ht_master htContextMenu htContextMenuCellPointerNone';
            editMenuItem.innerHTML = 'Advanced Edit';
            editMenuItem.addEventListener('click', openManualEditModal);
            contextMenu.appendChild(editMenuItem);
        }
    });
    
    // Transaction history view button
    document.getElementById('viewTransactionsBtn').addEventListener('click', showTransactionHistory);
}

// Save changes
async function saveChanges() {
    try {
        const data = hot.getData();
        const headers = hot.getColHeader();
        
        // Create array of objects with column headers as keys
        const formattedData = data.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                // Convert column header to data property
                const key = getKeyFromHeader(header);
                obj[key] = row[index];
            });
            return obj;
        });
        
        // Prepare transactions based on changes
        const { transactions, newProducts } = prepareTransactions(formattedData);
        
        // Process new products first (if any)
        if (newProducts.length > 0) {
            showNotification(`Adding ${newProducts.length} new product(s)...`, 'info');
            
            for (const newProduct of newProducts) {
                try {
                    // Add the new product to local DB
                    const addedProduct = await addNewProduct(newProduct);
                    
                    // If there's initial stock, create a stock-in transaction
                    if (addedProduct && addedProduct.id && newProduct.quantity > 0) {
                        await updateStockWithDetails({
                            product: addedProduct.id,
                            quantity: newProduct.quantity,
                            type: 'IN',
                            notes: `Initial stock from Excel: ${newProduct.notes || ''}`,
                            reference_number: `INIT-${new Date().getTime()}`,
                            unit_price: newProduct.price,
                            is_wastage: false
                        });
                    }
                } catch (error) {
                    console.error('Error adding new product:', error);
                    showNotification(`Error adding product: ${newProduct.name}`, 'danger');
                }
            }
        }
        
        // Process stock transactions
        for (const transaction of transactions) {
            if (transaction.action === 'update_product') {
                // Update product details
                await updateProductDetails(transaction);
            } else {
                // Regular stock transaction
                await updateStockWithDetails(transaction);
            }
        }
        
        // Record activity
        const activityMsg = [];
        if (transactions.length > 0) activityMsg.push(`${transactions.length} stock transactions`);
        if (newProducts.length > 0) activityMsg.push(`${newProducts.length} new products`);
        
        await recordActivity('Save', `Updated stock data: ${activityMsg.join(', ')}`);
        
        // Update last updated timestamp
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
        
        // Reset unsaved changes flag
        hasUnsavedChanges = false;
        
        // Show success notification
        showNotification('Stock data saved successfully');
        
        // Reload stock data
        await loadStockData();
        
        // Update the table with the latest data
        hot.loadData(stockData);
        
        // Update stats
        updateStats();
    } catch (error) {
        console.error('Error saving changes:', error);
        showNotification('Error saving changes', 'danger');
    }
}

// Prepare transactions based on changes
function prepareTransactions(formattedData) {
    const transactions = [];
    const newProducts = [];
    
    // Compare current data with original data
    formattedData.forEach(currentRow => {
        // Find original row
        const originalRow = stockData.find(row => row.id === currentRow.id);
        
        if (originalRow) {
            // Check if quantity or wastage has changed
            if (currentRow.quantity !== originalRow.quantity || currentRow.wastage !== originalRow.wastage) {
                // Calculate stock adjustment
                const quantityDiff = currentRow.quantity - originalRow.quantity;
                const wastageDiff = currentRow.wastage - originalRow.wastage;
                
                // If quantity decreased and wastage increased, it's a wastage transaction
                if (quantityDiff < 0 && wastageDiff > 0) {
                    // Create wastage transaction
                    transactions.push({
                        product: currentRow.id,
                        quantity: Math.abs(quantityDiff),
                        type: 'OUT',
                        notes: `Wastage: ${currentRow.notes || 'No notes provided'}`,
                        reference_number: `WASTE-${new Date().getTime()}`,
                        unit_price: currentRow.price,
                        is_wastage: true
                    });
                } 
                // If only quantity changed, it's a regular transaction
                else if (quantityDiff !== 0) {
                    transactions.push({
                        product: currentRow.id,
                        quantity: Math.abs(quantityDiff),
                        type: quantityDiff > 0 ? 'IN' : 'OUT',
                        notes: `Excel Stock Adjustment: ${currentRow.notes || 'No notes provided'}`,
                        reference_number: `ADJ-${new Date().getTime()}`,
                        unit_price: currentRow.price,
                        is_wastage: false
                    });
                }
            }
            
            // If product details have changed, update product
            if (currentRow.name !== originalRow.name ||
                currentRow.sku !== originalRow.sku ||
                currentRow.type !== originalRow.type ||
                currentRow.price !== originalRow.price ||
                currentRow.location !== originalRow.location) {
                
                // Add to product updates
                transactions.push({
                    action: 'update_product',
                    product_id: currentRow.id,
                    name: currentRow.name,
                    sku: currentRow.sku,
                    type: currentRow.type,
                    price: currentRow.price,
                    location: currentRow.location
                });
            }
        } else if (currentRow.name && currentRow.sku) {
            // This is a new product row
            newProducts.push({
                action: 'add_product',
                name: currentRow.name,
                sku: currentRow.sku,
                type: currentRow.type || 'Raw Material',
                quantity: parseInt(currentRow.quantity) || 0,
                price: parseFloat(currentRow.price) || 0,
                location: currentRow.location || '',
                notes: currentRow.notes || ''
            });
        }
    });
    
    return { transactions, newProducts };
}

// Get key from header
function getKeyFromHeader(header) {
    switch (header) {
        case 'ID': return 'id';
        case 'Product Name': return 'name';
        case 'SKU': return 'sku';
        case 'Type': return 'type';
        case 'Current Stock': return 'quantity';
        case 'Wastage': return 'wastage';
        case 'Unit Price': return 'price';
        case 'Location': return 'location';
        case 'Notes': return 'notes';
        default: return header.toLowerCase().replace(/\s+/g, '_');
    }
}

// Show product selection modal
function showProductSelectionModal(rowIndex) {
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="productSelectionModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Select Product</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="input-group mb-3">
                            <span class="input-group-text">
                                <i class="fas fa-search"></i>
                            </span>
                            <input type="text" class="form-control" id="productSearchInput" placeholder="Search products...">
                        </div>
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>SKU</th>
                                        <th>Type</th>
                                        <th>Price</th>
                                        <th>Stock</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="productSelectionBody">
                                    <!-- Products will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize and show the modal
    const modal = new bootstrap.Modal(document.getElementById('productSelectionModal'));
    modal.show();
    
    // Populate products
    const productSelectionBody = document.getElementById('productSelectionBody');
    
    productsData.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.sku}</td>
            <td>${product.type}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${product.quantity}</td>
            <td>
                <button class="btn btn-sm btn-primary select-product" data-product-id="${product.id}">
                    Select
                </button>
            </td>
        `;
        productSelectionBody.appendChild(row);
    });
    
    // Add search functionality
    document.getElementById('productSearchInput').addEventListener('input', function() {
        const searchQuery = this.value.toLowerCase();
        const rows = productSelectionBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const productName = row.querySelector('td:first-child').textContent.toLowerCase();
            const productSku = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            
            if (productName.includes(searchQuery) || productSku.includes(searchQuery)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
    
    // Add select functionality
    document.querySelectorAll('.select-product').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const product = productsData.find(p => p.id == productId);
            
            if (product) {
                const rowData = [
                    product.id,
                    product.name,
                    product.sku,
                    product.type,
                    product.quantity,
                    0, // Wastage
                    product.price,
                    product.location || '',
                    '' // Notes
                ];
                
                hot.setDataAtRow(rowIndex, rowData);
                hasUnsavedChanges = true;
                updateStats();
            }
            
            modal.hide();
        });
    });
    
    // Remove the modal from the DOM after hiding
    document.getElementById('productSelectionModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Export data to different formats
function exportData(type) {
    try {
        const data = hot.getData();
        const headers = hot.getColHeader();
        
        // Filter out empty rows
        const filteredData = data.filter(row => row[1]); // Filter rows with product name
        
        if (filteredData.length === 0) {
            showNotification('No data to export', 'warning');
            return;
        }
        
        if (type === 'csv') {
            exportToCsv(filteredData, headers);
        } else if (type === 'excel') {
            exportToExcel(filteredData, headers);
        } else if (type === 'pdf') {
            exportToPdf(filteredData, headers);
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification(`Error exporting data as ${type.toUpperCase()}`, 'danger');
    }
}

// Export data to CSV file
function exportToCsv(data, headers) {
    // Create CSV content
    const csvContent = Papa.unparse({
        fields: headers,
        data: data
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `stock_data_${formatDateForFilename(new Date())}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Record activity
    recordActivity('Export', 'Exported stock data as CSV');
    
    // Show success notification
    showNotification('Stock data exported as CSV', 'success');
}

// Export data to Excel file
function exportToExcel(data, headers) {
    try {
        // Create a worksheet
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        
        // Create a workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock Data');
        
        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        // Convert to Blob and download
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `stock_data_${formatDateForFilename(new Date())}.xlsx`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Record activity
        recordActivity('Export', 'Exported stock data as Excel');
        
        // Show success notification
        showNotification('Stock data exported as Excel', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Error exporting to Excel. Make sure SheetJS is loaded.', 'danger');
    }
}

// Export data to PDF file
function exportToPdf(data, headers) {
    try {
        const { jsPDF } = window.jspdf;
        
        // Create new PDF document
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text('Stock Data Report', 14, 15);
        
        // Add timestamp
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
        
        // Add table
        doc.autoTable({
            head: [headers],
            body: data,
            startY: 30,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 15 },  // ID
                1: { cellWidth: 35 },  // Product Name
                2: { cellWidth: 25 },  // SKU
                3: { cellWidth: 25 },  // Type
                4: { cellWidth: 20 },  // Current Stock
                5: { cellWidth: 20 },  // Wastage
                6: { cellWidth: 20 },  // Unit Price
                7: { cellWidth: 20 },  // Location
                8: { cellWidth: 'auto' } // Notes
            }
        });
        
        // Save the PDF
        doc.save(`stock_data_${formatDateForFilename(new Date())}.pdf`);
        
        // Record activity
        recordActivity('Export', 'Exported stock data as PDF');
        
        // Show success notification
        showNotification('Stock data exported as PDF', 'success');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showNotification('Error exporting to PDF. Make sure jsPDF is loaded.', 'danger');
    }
}

// Import data from file
function importData() {
    try {
        const fileInput = document.getElementById('fileInput');
        const hasHeaders = document.getElementById('headerRowCheck').checked;
        
        if (!fileInput.files || fileInput.files.length === 0) {
            showNotification('Please select a file to import', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.csv')) {
            importCsvData(file, hasHeaders);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            importExcelData(file, hasHeaders);
        } else {
            showNotification('Unsupported file format. Please select a CSV or Excel file.', 'error');
        }
    } catch (error) {
        console.error('Error importing data:', error);
        showNotification('Error importing data', 'danger');
    }
}

// Import data from CSV file
function importCsvData(file, hasHeaders) {
    // Show loading indicator
    showNotification('Importing CSV data...', 'info');
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const csvData = e.target.result;
        
        // Parse CSV
        Papa.parse(csvData, {
            header: hasHeaders,
            complete: function(results) {
                processImportedData(results.data, hasHeaders);
            },
            error: function(error) {
                console.error('Error parsing CSV:', error);
                showNotification('Error parsing CSV file', 'danger');
            }
        });
    };
    
    reader.onerror = function() {
        showNotification('Error reading file', 'danger');
    };
    
    reader.readAsText(file);
}

// Import data from Excel file
function importExcelData(file, hasHeaders) {
    // Show loading indicator
    showNotification('Importing Excel data...', 'info');
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: hasHeaders ? undefined : 1 });
            
            processImportedData(jsonData, hasHeaders);
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            showNotification('Error parsing Excel file', 'danger');
        }
    };
    
    reader.onerror = function() {
        showNotification('Error reading file', 'danger');
    };
    
    reader.readAsArrayBuffer(file);
}

// Process imported data
function processImportedData(data, hasHeaders) {
    if (!data || data.length === 0) {
        showNotification('No data found in the file', 'warning');
        return;
    }
    
    try {
        // Map data to match our format
        const mappedData = mapImportedData(data, hasHeaders);
        
        // Load data into table
        hot.loadData(mappedData);
        hasUnsavedChanges = true;
        
        // Update stats
        updateStats();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
        
        // Record activity
        recordActivity('Import', `Imported ${mappedData.length} rows from file`);
        
        // Show success notification
        showNotification(`Successfully imported ${mappedData.length} rows`, 'success');
    } catch (error) {
        console.error('Error processing imported data:', error);
        showNotification('Error processing data from file', 'danger');
    }
}

// Download template file
function downloadTemplate() {
    try {
        const headers = hot.getColHeader();
        const sampleData = [
            ['', 'Product A', 'SKU-A', 'Raw Material', '100', '0', '25.50', 'Warehouse A', 'Sample note'],
            ['', 'Product B', 'SKU-B', 'Finished Product', '50', '2', '45.75', 'Store 1', '']
        ];
        
        // Create a worksheet
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
        
        // Create a workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        
        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        // Convert to Blob and download
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'stock_template.xlsx');
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Record activity
        recordActivity('Template', 'Downloaded stock template file');
        
        // Show success notification
        showNotification('Template file downloaded', 'success');
    } catch (error) {
        console.error('Error creating template:', error);
        showNotification('Error creating template file', 'danger');
    }
}

// Update stats
function updateStats() {
    try {
        // Calculate totals
        let totalItems = 0;
        let totalWastage = 0;
        let totalValue = 0;
        
        stockData.forEach(row => {
            totalItems += parseInt(row.quantity) || 0;
            totalWastage += parseInt(row.wastage) || 0;
            totalValue += (parseInt(row.quantity) || 0) * (parseFloat(row.price) || 0);
        });
        
        // Update UI
        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('totalWastage').textContent = totalWastage;
        document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Record activity
async function recordActivity(action, details) {
    try {
        // Get activity logs from local storage
        let activityLogs = JSON.parse(localStorage.getItem(`${excelDbName}_activity`) || '[]');
        
        // Create new activity log
        const newLog = {
            timestamp: new Date().toISOString(),
            user: username,
            action: action,
            details: details
        };
        
        // Add to activity logs array
        activityLogs.unshift(newLog); // Add to beginning
        
        // Limit to 100 entries
        if (activityLogs.length > 100) {
            activityLogs = activityLogs.slice(0, 100);
        }
        
        // Save back to local storage
        localStorage.setItem(`${excelDbName}_activity`, JSON.stringify(activityLogs));
        
        // Update UI
        const activityLogTable = document.getElementById('activityLogTable');
        
        // Create new row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(newLog.timestamp).toLocaleString()}</td>
            <td>${newLog.user}</td>
            <td>${newLog.action}</td>
            <td>${newLog.details}</td>
        `;
        
        // Add to top of table
        if (activityLogTable.firstChild) {
            activityLogTable.insertBefore(row, activityLogTable.firstChild);
        } else {
            activityLogTable.appendChild(row);
        }
        
        return newLog;
    } catch (error) {
        console.error('Error recording activity:', error);
    }
}

// Load activity logs
async function loadActivityLogs() {
    try {
        // Get activity logs from local storage
        const activityLogs = JSON.parse(localStorage.getItem(`${excelDbName}_activity`) || '[]');
        
        // Update UI
        const activityLogTable = document.getElementById('activityLogTable');
        activityLogTable.innerHTML = ''; // Clear existing rows
        
        // Add rows for each activity log
        activityLogs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.user}</td>
                <td>${log.action}</td>
                <td>${log.details}</td>
            `;
            
            activityLogTable.appendChild(row);
        });
        
        // If no logs, add a placeholder
        if (activityLogs.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="4" class="text-center">No activity recorded yet</td>
            `;
            
            activityLogTable.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading activity logs:', error);
    }
}

// Helper function to format date for filenames
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}`;
}

// Get current user
async function getCurrentUser() {
    // In a real app, you'd get this from the server
    // For now, we'll just return a placeholder
    return {
        username: localStorage.getItem('username') || 'User'
    };
}

// Open manual edit modal for selected cell
function openManualEditModal() {
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    const value = hot.getDataAtCell(row, col);
    const comment = hot.getCellMeta(row, col).comment;
    
    document.getElementById('cellValue').value = value || '';
    document.getElementById('cellComment').value = comment ? comment.value : '';
    
    const columnName = hot.getColHeader(col);
    document.querySelector('#manualEditModal .modal-title').textContent = `Edit ${columnName}`;
    
    const modalElement = document.getElementById('manualEditModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Save manual edit
function saveManualEdit() {
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    const value = document.getElementById('cellValue').value;
    const comment = document.getElementById('cellComment').value;
    
    const oldValue = hot.getDataAtCell(row, col);
    hot.setDataAtCell(row, col, value);
    
    if (comment) {
        hot.setCellMeta(row, col, 'comment', { value: comment });
    } else {
        hot.removeCellMeta(row, col, 'comment');
    }
    
    hot.render();
    logActivity(`Manually edited cell at row ${row + 1}, column ${col + 1}`);
    
    hasUnsavedChanges = true;
    updateStats();
    
    const modalElement = document.getElementById('manualEditModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.hide();
}

// Map imported data to match our format
function mapImportedData(importedData, hasHeaders) {
    try {
        // If the first row has headers, we need to map the fields
        let mappedData;
        
        if (hasHeaders) {
            mappedData = importedData.map((row, index) => {
                // Get the keys of the current row
                const keys = Object.keys(row);
                
                // Create a new object with our expected structure
                return {
                    id: parseInt(row.id || row.ID || index + 1),
                    name: row.product_name || row['Product Name'] || row.product || '',
                    sku: row.sku || row.SKU || '',
                    type: row.type || row.Type || 'Raw Material',
                    quantity: parseFloat(row.current_stock || row['Current Stock'] || 0),
                    wastage: parseFloat(row.wastage || row.Wastage || 0),
                    price: parseFloat(row.unit_price || row['Unit Price'] || 0),
                    location: row.location || row.Location || '',
                    notes: row.notes || row.Notes || ''
                };
            });
        } else {
            // If no headers, assume the columns are in the right order
            mappedData = importedData.map((row, index) => {
                // For array data (no headers)
                const rowArray = Array.isArray(row) ? row : Object.values(row);
                
                return {
                    id: index + 1,
                    name: rowArray[1] || '',
                    sku: rowArray[2] || '',
                    type: rowArray[3] || 'Raw Material',
                    quantity: parseFloat(rowArray[4]) || 0,
                    wastage: parseFloat(rowArray[5]) || 0,
                    price: parseFloat(rowArray[6]) || 0,
                    location: rowArray[7] || '',
                    notes: rowArray[8] || ''
                };
            });
        }
        
        // Try to match products with existing products
        return mappedData.map(row => {
            // Try to find matching product by name or SKU
            let product = null;
            
            if (row.sku) {
                product = productsData.find(p => p.sku === row.sku);
            }
            
            if (!product && row.name) {
                product = productsData.find(p => p.name === row.name);
            }
            
            if (product) {
                return {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    type: product.type,
                    quantity: row.quantity,
                    wastage: row.wastage,
                    price: row.price || product.price,
                    location: row.location || product.location || '',
                    notes: row.notes || ''
                };
            } else {
                // Return the row as is if no product found
                return row;
            }
        }).filter(row => row.name); // Filter out rows without product name
    } catch (error) {
        console.error('Error mapping imported data:', error);
        throw error;
    }
}

// Add a new product
async function addNewProduct(productData) {
    try {
        // Get products from local storage
        let products = JSON.parse(localStorage.getItem(`${excelDbName}_products`) || '[]');
        
        // Generate new ID
        const newProductId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        
        const newProduct = {
            id: newProductId,
            name: productData.name,
            sku: productData.sku,
            type: productData.type,
            price: productData.price,
            quantity: 0, // Start with 0, we'll update with a stock transaction
            location: productData.location,
            min_stock_level: 5, // Default value
        };
        
        // Add to products array
        products.push(newProduct);
        
        // Save back to local storage
        localStorage.setItem(`${excelDbName}_products`, JSON.stringify(products));
        
        // Update productsData
        productsData = products;
        
        return newProduct;
    } catch (error) {
        console.error('Error adding new product:', error);
        throw error;
    }
}

// Update product details
async function updateProductDetails(productData) {
    try {
        // Get products from local storage
        let products = JSON.parse(localStorage.getItem(`${excelDbName}_products`) || '[]');
        
        // Find the product to update
        const index = products.findIndex(p => p.id === productData.product_id);
        
        if (index !== -1) {
            // Update product
            products[index] = {
                ...products[index],
                name: productData.name,
                sku: productData.sku,
                type: productData.type,
                price: productData.price,
                location: productData.location
            };
            
            // Save back to local storage
            localStorage.setItem(`${excelDbName}_products`, JSON.stringify(products));
            
            // Update productsData
            productsData = products;
            
            return products[index];
        }
        
        return null;
    } catch (error) {
        console.error('Error updating product details:', error);
        throw error;
    }
}

// Update stock with details
async function updateStockWithDetails(transaction) {
    try {
        // Get stock transactions from local storage
        let stockTransactions = JSON.parse(localStorage.getItem(`${excelDbName}_stock`) || '[]');
        
        // Add transaction timestamp
        transaction.timestamp = new Date().toISOString();
        transaction.user = username;
        
        // Add to transactions array
        stockTransactions.push(transaction);
        
        // Save back to local storage
        localStorage.setItem(`${excelDbName}_stock`, JSON.stringify(stockTransactions));
        
        // Update full transactions list
        fullStockTransactions = stockTransactions;
        
        return transaction;
    } catch (error) {
        console.error('Error updating stock:', error);
        throw error;
    }
}

// Add a new empty row for adding a product manually
function addNewEmptyRow() {
    const newRow = {
        id: null,
        name: '',
        sku: '',
        type: 'Raw Material',
        quantity: 0,
        wastage: 0,
        price: 0,
        location: '',
        notes: ''
    };
    
    hot.alter('insert_row', hot.countRows());
    hot.setDataAtRow(hot.countRows() - 1, Object.values(newRow));
    
    // Set cell focus to the name field of the new row
    setTimeout(() => {
        hot.selectCell(hot.countRows() - 1, 1); // Select name column
    }, 100);
    
    hasUnsavedChanges = true;
    
    // Auto-save the new row
    autoSaveChanges();
    
    updateStats();
    
    showNotification('Added new row. Enter product details.', 'info');
}

// Initialize date filters
function initializeDateFilters() {
    // Set default date values
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    // Format dates for inputs
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    // Set default values for date inputs
    document.getElementById('startDate').value = formatDateForInput(oneMonthAgo);
    document.getElementById('endDate').value = formatDateForInput(today);
    
    // Add event listener for filter button
    document.getElementById('filterDatesBtn').addEventListener('click', filterByDateRange);
    
    // Add event listener for reset button
    document.getElementById('resetFilterBtn').addEventListener('click', resetDateFilter);
}

// Filter stock data by date range
function filterByDateRange() {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    // Adjust end date to include the entire day
    endDate.setHours(23, 59, 59, 999);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        showNotification('Please enter valid dates', 'warning');
        return;
    }
    
    if (startDate > endDate) {
        showNotification('Start date cannot be after end date', 'warning');
        return;
    }
    
    // Filter transactions by date range
    const filteredTransactions = fullStockTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.timestamp);
        return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    // Convert filtered transactions to spreadsheet format
    const filteredData = convertStockTransactionsToSpreadsheetFormat(filteredTransactions);
    
    // Update the table with filtered data
    hot.loadData(filteredData);
    
    // Update UI to show filter is active
    document.getElementById('filterStatus').textContent = 'Filtered';
    document.getElementById('filterStatus').classList.add('badge', 'bg-warning', 'text-dark');
    
    // Update stats based on filtered data
    updateStatsFromData(filteredData);
    
    // Show notification
    const dateRangeText = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    showNotification(`Showing transactions from ${dateRangeText}`, 'info');
}

// Reset date filter
function resetDateFilter() {
    // Load original stock data
    hot.loadData(stockData);
    
    // Update UI to show filter is inactive
    document.getElementById('filterStatus').textContent = 'All Data';
    document.getElementById('filterStatus').classList.remove('bg-warning');
    document.getElementById('filterStatus').classList.add('bg-success');
    
    // Update stats
    updateStats();
    
    // Show notification
    showNotification('Showing all transactions', 'info');
}

// Update stats from filtered data
function updateStatsFromData(data) {
    try {
        // Calculate totals
        let totalItems = 0;
        let totalWastage = 0;
        let totalValue = 0;
        
        data.forEach(row => {
            totalItems += parseInt(row.quantity) || 0;
            totalWastage += parseInt(row.wastage) || 0;
            totalValue += (parseInt(row.quantity) || 0) * (parseFloat(row.price) || 0);
        });
        
        // Update UI
        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('totalWastage').textContent = totalWastage;
        document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    } catch (error) {
        console.error('Error updating stats from filtered data:', error);
    }
}

// Show transaction history modal
function showTransactionHistory() {
    // Get the product from the selected row
    if (!selectedCell) {
        showNotification('Please select a product row first', 'warning');
        return;
    }
    
    const row = selectedCell.row;
    const productId = hot.getDataAtCell(row, 0); // Assuming ID is in column 0
    
    if (!productId) {
        showNotification('Cannot find product ID. Please select a valid product row.', 'warning');
        return;
    }
    
    // Filter transactions for this product
    const productTransactions = fullStockTransactions.filter(t => t.product == productId);
    
    // Find product details
    const product = productsData.find(p => p.id == productId);
    
    if (!product) {
        showNotification('Product details not found', 'warning');
        return;
    }
    
    // Create and show modal
    const modalHTML = `
        <div class="modal fade" id="transactionHistoryModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Transaction History: ${product.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="product-details mb-3">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>SKU:</strong> ${product.sku}</p>
                                    <p><strong>Type:</strong> ${product.type}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Current Stock:</strong> ${stockData.find(p => p.id == productId)?.quantity || 0}</p>
                                    <p><strong>Price:</strong> ${formatCurrency(product.price)}</p>
                                </div>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>Type</th>
                                        <th>Quantity</th>
                                        <th>Reference</th>
                                        <th>Notes</th>
                                        <th>User</th>
                                    </tr>
                                </thead>
                                <tbody id="transactionHistoryBody">
                                    ${productTransactions.length > 0 ? 
                                        productTransactions.map(t => `
                                            <tr>
                                                <td>${new Date(t.timestamp).toLocaleString()}</td>
                                                <td><span class="badge bg-${t.type === 'IN' ? 'success' : 'danger'}">${t.type}</span></td>
                                                <td>${t.quantity}</td>
                                                <td>${t.reference_number || 'N/A'}</td>
                                                <td>${t.notes || 'No notes'}</td>
                                                <td>${t.user || 'Unknown'}</td>
                                            </tr>
                                        `).join('') : 
                                        `<tr><td colspan="6" class="text-center">No transactions found</td></tr>`
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize and show modal
    const modal = new bootstrap.Modal(document.getElementById('transactionHistoryModal'));
    modal.show();
    
    // Remove modal from DOM after hiding
    document.getElementById('transactionHistoryModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Helper function to format currency
function formatCurrency(amount) {
    return '৳' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Function to show the add column modal
function showAddColumnModal() {
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="addColumnModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Custom Column</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="columnName" class="form-label">Column Name</label>
                            <input type="text" class="form-control" id="columnName" placeholder="Enter column name">
                        </div>
                        <div class="mb-3">
                            <label for="columnType" class="form-label">Column Type</label>
                            <select class="form-select" id="columnType">
                                <option value="text" selected>Text</option>
                                <option value="numeric">Number</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="date">Date</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmAddColumn">Add Column</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('addColumnModal'));
    modal.show();
    
    // Add event listener for the confirm button
    document.getElementById('confirmAddColumn').addEventListener('click', function() {
        const columnName = document.getElementById('columnName').value.trim();
        const columnType = document.getElementById('columnType').value;
        
        if (!columnName) {
            showNotification('Column name cannot be empty', 'warning');
            return;
        }
        
        addCustomColumn(columnName, columnType);
        
        // Hide and remove modal
        modal.hide();
        document.getElementById('addColumnModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    });
}

// Function to add a custom column
function addCustomColumn(columnName, columnType) {
    try {
        // Generate a unique ID for the column
        const columnId = 'custom_' + Date.now();
        
        // Get current columns
        const currentColumns = hot.getSettings().columns || [];
        const currentHeaders = hot.getColHeader();
        
        // Add new column definition
        const newColumn = {
            data: columnId,
            title: columnName,
            width: 120,
            type: columnType || 'text'
        };
        
        // Update columns array
        const updatedColumns = [...currentColumns, newColumn];
        
        // Update Handsontable settings
        hot.updateSettings({
            columns: updatedColumns,
            colHeaders: [...currentHeaders, columnName]
        });
        
        // Show success notification
        showNotification(`Column "${columnName}" added successfully`, 'success');
        
        // Record activity
        recordActivity('Column Added', `Added column: ${columnName}`);
        
        return true;
    } catch (error) {
        console.error('Error adding column:', error);
        showNotification('Error adding column', 'danger');
        return false;
    }
}

// Function to show the manage columns modal
function showManageColumnsModal() {
    // Get current columns
    const currentColumns = hot.getSettings().columns || [];
    const currentHeaders = hot.getColHeader();
    
    // Define required columns that shouldn't be removable
    const requiredColumnIndexes = [0, 1, 2, 4]; // ID, Name, SKU, Quantity
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="manageColumnsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Manage Columns</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i> Core columns (ID, Name, SKU, Quantity) cannot be removed but can be renamed.
                        </div>
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Original Name</th>
                                        <th>Display Name</th>
                                        <th>Type</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${currentColumns.map((column, index) => `
                                        <tr data-index="${index}">
                                            <td>${column.title || currentHeaders[index]}</td>
                                            <td>
                                                <input type="text" class="form-control form-control-sm column-name-input" 
                                                    value="${column.title || currentHeaders[index]}" 
                                                    data-index="${index}">
                                            </td>
                                            <td>${column.type || 'text'}</td>
                                            <td>
                                                ${requiredColumnIndexes.includes(index) ? 
                                                    '<span class="badge bg-secondary">Required</span>' : 
                                                    `<button class="btn btn-sm btn-danger remove-column-btn" data-index="${index}">
                                                        <i class="fas fa-trash"></i> Remove
                                                    </button>`
                                                }
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="applyColumnChanges">Apply Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('manageColumnsModal'));
    modal.show();
    
    // Keep track of columns to remove
    const columnsToRemove = [];
    
    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-column-btn').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            
            // Mark column for removal
            columnsToRemove.push(index);
            
            // Hide the row
            this.closest('tr').style.display = 'none';
        });
    });
    
    // Add event listener for Apply Changes button
    document.getElementById('applyColumnChanges').addEventListener('click', function() {
        // Get column name changes
        const nameChanges = [];
        document.querySelectorAll('.column-name-input').forEach(input => {
            const index = parseInt(input.getAttribute('data-index'));
            const newName = input.value.trim();
            
            if (newName && newName !== currentHeaders[index]) {
                nameChanges.push({
                    index,
                    newName
                });
            }
        });
        
        // Apply column removals (in reverse order to avoid index shifting)
        if (columnsToRemove.length > 0) {
            // Sort in descending order
            columnsToRemove.sort((a, b) => b - a);
            
            const updatedColumns = [...currentColumns];
            const updatedHeaders = [...currentHeaders];
            
            columnsToRemove.forEach(index => {
                updatedColumns.splice(index, 1);
                updatedHeaders.splice(index, 1);
            });
            
            // Apply changes to Handsontable
            hot.updateSettings({
                columns: updatedColumns,
                colHeaders: updatedHeaders
            });
            
            recordActivity('Columns Removed', `Removed ${columnsToRemove.length} column(s)`);
        }
        
        // Apply column name changes
        if (nameChanges.length > 0) {
            const updatedHeaders = [...hot.getColHeader()];
            
            nameChanges.forEach(change => {
                updatedHeaders[change.index] = change.newName;
            });
            
            // Apply changes to Handsontable
            hot.updateSettings({
                colHeaders: updatedHeaders
            });
            
            recordActivity('Columns Renamed', `Renamed ${nameChanges.length} column(s)`);
        }
        
        // Show notification
        const totalChanges = columnsToRemove.length + nameChanges.length;
        if (totalChanges > 0) {
            showNotification(`Applied ${totalChanges} column changes`, 'success');
        } else {
            showNotification('No changes made', 'info');
        }
        
        // Hide and remove modal
        modal.hide();
        document.getElementById('manageColumnsModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    });
} 