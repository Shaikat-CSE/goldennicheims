// reports.js - Reports functionality for Golden Niche IMS

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!checkAuth()) return;
    
    try {
        // Initialize reports page
        await initReportsPage();
    } catch (error) {
        console.error('Error initializing reports page:', error);
        showNotification('Error loading reports data', 'danger');
    }
});

// Initialize reports page
async function initReportsPage() {
    try {
        // Load summary stats
        await loadSummaryStats();
        
        // Load products, stock history, suppliers, and clients data
        const [products, stockHistory, suppliers, clients] = await Promise.all([
            getProducts(),
            getStockHistory(),
            getSuppliers(),
            getClients()
        ]);
        
        // Initialize report filters
        initializeReportFilters(products, suppliers, clients);
        
        // Load charts
        createTransactionsChart(stockHistory);
        createCategoryChart(products);
        
        // Load stock history table
        loadStockHistoryTable(stockHistory, products);
        
        // Set up event listeners for export, print, and report generation
        setupEventListeners(products, stockHistory, suppliers, clients);
    } catch (error) {
        console.error('Error loading reports data:', error);
        throw error;
    }
}

// Initialize report filters
function initializeReportFilters(products, suppliers, clients) {
    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('startDate').valueAsDate = thirtyDaysAgo;
    document.getElementById('endDate').valueAsDate = today;
    
    // Populate product filter
    const productFilter = document.getElementById('productFilter');
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        productFilter.appendChild(option);
    });
    
    // Populate product type filter
    const productTypes = [...new Set(products.map(product => product.type))];
    const productTypeFilter = document.getElementById('productTypeFilter');
    productTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        productTypeFilter.appendChild(option);
    });
    
    // Populate supplier filter
    const supplierFilter = document.getElementById('supplierFilter');
    suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = supplier.name;
        supplierFilter.appendChild(option);
    });
    
    // Populate client filter
    const clientFilter = document.getElementById('clientFilter');
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        clientFilter.appendChild(option);
    });
    
    // Set up report type change handler
    document.getElementById('reportType').addEventListener('change', function() {
        const reportType = this.value;
        const supplierContainer = document.getElementById('supplierFilterContainer');
        const clientContainer = document.getElementById('clientFilterContainer');
        
        if (reportType === 'purchases') {
            supplierContainer.style.display = 'block';
            clientContainer.style.display = 'none';
        } else if (reportType === 'sales') {
            supplierContainer.style.display = 'none';
            clientContainer.style.display = 'block';
        } else {
            supplierContainer.style.display = 'block';
            clientContainer.style.display = 'block';
        }
    });
}

// Load summary stats
async function loadSummaryStats() {
    try {
        const stats = await getInventoryStats();
        
        // Update UI with stats
        document.getElementById('totalProducts').textContent = stats.total_products || 0;
        document.getElementById('inventoryValue').textContent = formatCurrency(stats.total_value || 0);
        document.getElementById('lowStock').textContent = stats.low_stock_count || 0;
    } catch (error) {
        console.error('Error loading summary stats:', error);
        throw error;
    }
}

// Create transactions chart (last 30 days)
function createTransactionsChart(stockHistory) {
    // Get dates for the last 30 days
    const dates = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    
    // Count stock in and stock out for each day
    const stockInData = Array(30).fill(0);
    const stockOutData = Array(30).fill(0);
    
    stockHistory.forEach(transaction => {
        const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
        const dateIndex = dates.indexOf(transactionDate);
        
        if (dateIndex !== -1) {
            if (transaction.type === 'IN') {
                stockInData[dateIndex] += transaction.quantity;
            } else {
                stockOutData[dateIndex] += transaction.quantity;
            }
        }
    });
    
    // Format dates for display
    const formattedDates = dates.map(date => {
        const [year, month, day] = date.split('-');
        return `${month}/${day}`;
    });
    
    // Create chart
    const ctx = document.getElementById('transactionsChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: [
                {
                    label: 'Stock In',
                    data: stockInData,
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2,
                    tension: 0.1
                },
                {
                    label: 'Stock Out',
                    data: stockOutData,
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date (MM/DD)'
                    }
                }
            }
        }
    });
}

// Create custom report chart based on filtered data
function createCustomReportChart(filteredData, startDate, endDate) {
    // Get all dates between start and end date
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dates.push(date.toISOString().split('T')[0]);
    }
    
    // Count stock in and stock out for each day
    const stockInData = Array(dates.length).fill(0);
    const stockOutData = Array(dates.length).fill(0);
    
    filteredData.forEach(transaction => {
        const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
        const dateIndex = dates.indexOf(transactionDate);
        
        if (dateIndex !== -1) {
            if (transaction.type === 'IN') {
                stockInData[dateIndex] += transaction.quantity;
            } else {
                stockOutData[dateIndex] += transaction.quantity;
            }
        }
    });
    
    // Format dates for display
    const formattedDates = dates.map(date => {
        const [year, month, day] = date.split('-');
        return `${month}/${day}`;
    });
    
    // Create chart
    const ctx = document.getElementById('customReportChart').getContext('2d');
    
    // Remove existing chart if it exists
    if (window.customReportChart) {
        window.customReportChart.destroy();
    }
    
    window.customReportChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: [
                {
                    label: 'Stock In',
                    data: stockInData,
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2,
                    tension: 0.1
                },
                {
                    label: 'Stock Out',
                    data: stockOutData,
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date (MM/DD)'
                    }
                }
            }
        }
    });
}

// Create category chart
function createCategoryChart(products) {
    // Group products by category and calculate total value
    const categories = {};
    
    products.forEach(product => {
        const type = product.type;
        const value = product.quantity * product.price;
        
        if (!categories[type]) {
            categories[type] = 0;
        }
        
        categories[type] += value;
    });
    
    // Prepare data for chart
    const categoryLabels = Object.keys(categories);
    const categoryValues = Object.values(categories);
    
    // Create chart
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryLabels,
            datasets: [{
                data: categoryValues,
                backgroundColor: [
                    '#FFC107',
                    '#FF9800',
                    '#FF5722',
                    '#E91E63',
                    '#9C27B0',
                    '#673AB7'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `${context.label}: ${formatCurrency(value)}`;
                        }
                    }
                }
            }
        }
    });
}

// Load stock history table
function loadStockHistoryTable(stockHistory, products) {
    const tableBody = document.getElementById('stockHistoryTable');
    
    // Create a map of product IDs to products for quick lookup
    const productsMap = {};
    products.forEach(product => {
        productsMap[product.id] = product;
    });
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Sort transactions by date (newest first)
    const sortedHistory = [...stockHistory].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Generate table rows
    sortedHistory.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
        
        // Get product info
        const product = productsMap[transaction.product];
        const sku = product ? product.sku : 'N/A';
        
        // Determine transaction class and label
        const transactionClass = transaction.type === 'IN' ? 'text-success' : 'text-danger';
        const transactionLabel = transaction.type === 'IN' ? 'Stock In' : 'Stock Out';
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${transaction.product_name}</td>
            <td>${sku}</td>
            <td><span class="${transactionClass}">${transactionLabel}</span></td>
            <td>${transaction.quantity}</td>
            <td>${transaction.notes || '-'}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Show message if no history
    if (sortedHistory.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No stock transactions found</td></tr>';
    }
}

// Generate custom report
function generateCustomReport(stockHistory, products, suppliers, clients) {
    // Get filter values
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const productId = document.getElementById('productFilter').value;
    const productType = document.getElementById('productTypeFilter').value;
    const supplierId = document.getElementById('supplierFilter').value;
    const clientId = document.getElementById('clientFilter').value;
    const includeCharts = document.getElementById('includeCharts').checked;
    
    // Create maps for quick lookups
    const productsMap = {};
    products.forEach(product => {
        productsMap[product.id] = product;
    });
    
    const suppliersMap = {};
    suppliers.forEach(supplier => {
        suppliersMap[supplier.id] = supplier;
    });
    
    const clientsMap = {};
    clients.forEach(client => {
        clientsMap[client.id] = client;
    });
    
    // Filter stock history
    let filteredData = stockHistory.filter(transaction => {
        const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
        
        // Date filter
        if (transactionDate < startDate || transactionDate > endDate) {
            return false;
        }
        
        // Transaction type filter
        if (reportType === 'sales' && transaction.type !== 'OUT') {
            return false;
        }
        
        if (reportType === 'purchases' && transaction.type !== 'IN') {
            return false;
        }
        
        // Product filter
        if (productId !== 'all' && transaction.product !== productId) {
            return false;
        }
        
        // Product type filter
        if (productType !== 'all') {
            const product = productsMap[transaction.product];
            if (product && product.type !== productType) {
                return false;
            }
        }
        
        // Supplier filter
        if (supplierId !== 'all' && transaction.type === 'IN') {
            if (transaction.supplier !== supplierId) {
                return false;
            }
        }
        
        // Client filter
        if (clientId !== 'all' && transaction.type === 'OUT') {
            if (transaction.client !== clientId) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort transactions by date (newest first)
    filteredData = filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Enhance transaction data with additional fields needed for the report
    filteredData = filteredData.map(transaction => {
        const product = productsMap[transaction.product];
        
        // Add UOM field if not present
        if (!product.unit_of_measure) {
            product.unit_of_measure = 'Unit';
        }
        
        // Add discount field if not present
        if (!transaction.discount) {
            transaction.discount = 0;
            
            // Add some random discounts for demo purposes (remove in production)
            if (Math.random() > 0.7) {
                const price = product ? product.price : 0;
                transaction.discount = Math.round(price * transaction.quantity * 0.05 * 100) / 100; // 5% discount
            }
        }
        
        return {
            ...transaction,
            uom: product ? product.unit_of_measure : 'Unit',
            discount: transaction.discount || 0
        };
    });
    
    // Display report results
    displayReportResults(filteredData, productsMap, suppliersMap, clientsMap, startDate, endDate, reportType, includeCharts);
    
    return filteredData;
}

// Display report results
function displayReportResults(filteredData, productsMap, suppliersMap, clientsMap, startDate, endDate, reportType, includeCharts) {
    // Show report results section
    document.getElementById('reportResults').style.display = 'block';
    
    // Generate report description
    let reportDescription = '';
    
    if (reportType === 'sales') {
        reportDescription = 'Sales Report';
    } else if (reportType === 'purchases') {
        reportDescription = 'Purchase Report';
    } else {
        reportDescription = 'All Transactions';
    }
    
    reportDescription += ` (${formatDate(startDate)} to ${formatDate(endDate)})`;
    
    document.getElementById('reportDescription').textContent = reportDescription;
    
    // Calculate summary statistics
    const totalTransactions = filteredData.length;
    
    let totalValue = 0;
    let totalItems = 0;
    let totalDiscount = 0;
    let totalPayable = 0;
    
    filteredData.forEach(transaction => {
        const product = productsMap[transaction.product];
        if (product) {
            const quantity = transaction.quantity || 0;
            const price = product.price || 0;
            const discount = transaction.discount || 0;
            
            const transactionValue = quantity * price;
            const payableAmount = transactionValue - discount;
            
            totalValue += transactionValue;
            totalItems += quantity;
            totalDiscount += discount;
            totalPayable += payableAmount;
        }
    });
    
    const avgTransaction = totalTransactions > 0 ? totalValue / totalTransactions : 0;
    
    // Update summary cards
    document.getElementById('totalTransactions').textContent = totalTransactions;
    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('avgTransaction').textContent = formatCurrency(avgTransaction);
    
    // Generate transaction table
    const tableBody = document.getElementById('customReportTable');
    tableBody.innerHTML = '';
    
    filteredData.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
        
        // Get product info
        const product = productsMap[transaction.product];
        const sku = product ? product.sku : 'N/A';
        const price = product ? product.price : 0;
        const uom = product ? (product.unit_of_measure || 'Unit') : 'Unit';
        
        // Calculate values
        const quantity = transaction.quantity || 0;
        const discount = transaction.discount || 0;
        const totalPrice = quantity * price;
        const payableAmount = totalPrice - discount;
        
        // Get supplier/client info
        let partyName = '-';
        if (transaction.type === 'IN' && transaction.supplier) {
            const supplier = suppliersMap[transaction.supplier];
            partyName = supplier ? supplier.name : '-';
        } else if (transaction.type === 'OUT' && transaction.client) {
            const client = clientsMap[transaction.client];
            partyName = client ? client.name : '-';
        }
        
        // Determine transaction class and label
        const transactionClass = transaction.type === 'IN' ? 'text-success' : 'text-danger';
        const transactionLabel = transaction.type === 'IN' ? 'Stock In' : 'Stock Out';
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${transaction.product_name}</td>
            <td>${sku}</td>
            <td><span class="${transactionClass}">${transactionLabel}</span></td>
            <td>${quantity}</td>
            <td>${uom}</td>
            <td>${formatCurrency(price)}</td>
            <td>${formatCurrency(discount)}</td>
            <td>${formatCurrency(totalPrice)}</td>
            <td>${formatCurrency(payableAmount)}</td>
            <td>${partyName}</td>
            <td>${transaction.reference || '-'}</td>
            <td>${transaction.notes || '-'}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Show message if no transactions
    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="13" class="text-center">No transactions found matching the selected criteria</td></tr>';
    }
    
    // Generate chart if needed
    if (includeCharts) {
        document.getElementById('customReportChartContainer').style.display = 'block';
        createCustomReportChart(filteredData, startDate, endDate);
    } else {
        document.getElementById('customReportChartContainer').style.display = 'none';
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Set up event listeners
function setupEventListeners(products, stockHistory, suppliers, clients) {
    // Print report button
    document.getElementById('printReportBtn').addEventListener('click', function() {
        // If a custom report is displayed, prepare it for printing
        if (document.getElementById('reportResults').style.display !== 'none') {
            prepareReportForPrinting();
        }
        window.print();
    });
    
    // Export buttons
    document.getElementById('exportCsvBtn').addEventListener('click', function() {
        // Export the appropriate table based on whether a custom report is displayed
        const tableId = document.getElementById('reportResults').style.display !== 'none' ? 
            'customReportTable' : 'stockHistoryTable';
        const filename = document.getElementById('reportResults').style.display !== 'none' ?
            'golden_niche_custom_report.csv' : 'golden_niche_stock_history.csv';
        exportTableToCSV(tableId, filename);
    });
    
    document.getElementById('exportExcelBtn').addEventListener('click', function() {
        // Export the appropriate table based on whether a custom report is displayed
        const tableId = document.getElementById('reportResults').style.display !== 'none' ? 
            'customReportTable' : 'stockHistoryTable';
        const filename = document.getElementById('reportResults').style.display !== 'none' ?
            'golden_niche_custom_report.xlsx' : 'golden_niche_stock_history.xlsx';
        exportTableToExcel(tableId, filename);
    });
    
    document.getElementById('exportPdfBtn').addEventListener('click', function() {
        // Export the appropriate table based on whether a custom report is displayed
        const isCustomReport = document.getElementById('reportResults').style.display !== 'none';
        const tableId = isCustomReport ? 'customReportTable' : 'stockHistoryTable';
        const filename = isCustomReport ?
            'golden_niche_custom_report.pdf' : 'golden_niche_stock_history.pdf';
        
        console.log(`Exporting PDF for table: ${tableId}`);
        
        // Verify the table exists and has data
        const table = document.getElementById(tableId);
        if (!table) {
            console.error(`Table with ID ${tableId} not found`);
            alert('Error: Could not find the table to export. Please try again.');
            return;
        }
        
        const rows = table.querySelectorAll('tbody tr');
        console.log(`Table has ${rows.length} rows`);
        
        exportTableToPDF(tableId, filename);
    });
    
    // Generate report form
    document.getElementById('reportForm').addEventListener('submit', function(e) {
        e.preventDefault();
        generateCustomReport(stockHistory, products, suppliers, clients);
    });
    
    // Modify report button
    document.getElementById('modifyReportBtn').addEventListener('click', function() {
        document.getElementById('reportResults').style.display = 'none';
    });
}

// Prepare report for printing
function prepareReportForPrinting() {
    // Add print-specific styles
    const style = document.createElement('style');
    style.id = 'print-style';
    style.innerHTML = `
        @media print {
            body * {
                visibility: hidden;
            }
            #reportResults, #reportResults * {
                visibility: visible;
            }
            #reportResults {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            #modifyReportBtn {
                display: none !important;
            }
            .card {
                border: 1px solid #ddd !important;
                margin-bottom: 20px !important;
            }
            .card-header {
                background-color: #f8f9fa !important;
                border-bottom: 1px solid #ddd !important;
            }
            .table {
                width: 100% !important;
                border-collapse: collapse !important;
            }
            .table th, .table td {
                border: 1px solid #ddd !important;
                padding: 8px !important;
            }
            .table thead th {
                background-color: #f8f9fa !important;
            }
            @page {
                size: landscape;
                margin: 1cm;
            }
        }
    `;
    
    // Remove existing print style if it exists
    const existingStyle = document.getElementById('print-style');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    document.head.appendChild(style);
    
    // Add a header with report information
    const reportHeader = document.createElement('div');
    reportHeader.id = 'print-header';
    reportHeader.className = 'mb-4 print-only';
    reportHeader.innerHTML = `
        <div class="text-center mb-4">
            <h2>Golden Niche IMS</h2>
            <h3>${document.getElementById('reportDescription').textContent}</h3>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
    `;
    
    // Remove existing header if it exists
    const existingHeader = document.getElementById('print-header');
    if (existingHeader) {
        existingHeader.remove();
    }
    
    // Insert the header at the top of the report results
    const reportResults = document.getElementById('reportResults');
    reportResults.insertBefore(reportHeader, reportResults.firstChild);
    
    // Clean up after printing
    setTimeout(() => {
        style.remove();
        reportHeader.remove();
    }, 5000);
}

// Export table to CSV
function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const rows = table.querySelectorAll('tr');
    let csv = [];
    
    // If we're exporting a custom report, add report header info
    if (tableId === 'customReportTable') {
        const reportDescription = document.getElementById('reportDescription').textContent;
        csv.push(`Golden Niche IMS - ${reportDescription}`);
        csv.push(`Generated on: ${new Date().toLocaleString()}`);
        csv.push(''); // Empty line for spacing
        
        // Add summary statistics
        csv.push('Report Summary:');
        csv.push(`Total Transactions: ${document.getElementById('totalTransactions').textContent}`);
        csv.push(`Total Value: ${document.getElementById('totalValue').textContent}`);
        csv.push(`Total Items: ${document.getElementById('totalItems').textContent}`);
        csv.push(`Average Transaction: ${document.getElementById('avgTransaction').textContent}`);
        csv.push(''); // Empty line for spacing
    }
    
    for (let i = 0; i < rows.length; i++) {
        const row = [], cols = rows[i].querySelectorAll('td, th');
        
        for (let j = 0; j < cols.length; j++) {
            // Get text content and clean it
            let data = cols[j].textContent.replace(/(\r\n|\n|\r)/gm, '').trim();
            
            // Quote fields with commas
            if (data.includes(',')) {
                data = `"${data}"`;
            }
            
            row.push(data);
        }
        
        csv.push(row.join(','));
    }
    
    // Download CSV file
    downloadCSV(csv.join('\n'), filename);
}

// Download CSV file
function downloadCSV(csv, filename) {
    const csvFile = new Blob([csv], {type: 'text/csv'});
    const downloadLink = document.createElement('a');
    
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Export table to Excel
function exportTableToExcel(tableId, filename) {
    // This is a simplified version - in a real app, you might use a library like SheetJS
    const table = document.getElementById(tableId);
    if (!table) return;
    
    // Convert table to CSV first
    const rows = table.querySelectorAll('tr');
    let csv = [];
    
    // If we're exporting a custom report, add report header info
    if (tableId === 'customReportTable') {
        const reportDescription = document.getElementById('reportDescription').textContent;
        csv.push(`Golden Niche IMS - ${reportDescription}`);
        csv.push(`Generated on: ${new Date().toLocaleString()}`);
        csv.push(''); // Empty line for spacing
        
        // Add summary statistics
        csv.push('Report Summary:');
        csv.push(`Total Transactions:\t${document.getElementById('totalTransactions').textContent}`);
        csv.push(`Total Value:\t${document.getElementById('totalValue').textContent}`);
        csv.push(`Total Items:\t${document.getElementById('totalItems').textContent}`);
        csv.push(`Average Transaction:\t${document.getElementById('avgTransaction').textContent}`);
        csv.push(''); // Empty line for spacing
    }
    
    for (let i = 0; i < rows.length; i++) {
        const row = [], cols = rows[i].querySelectorAll('td, th');
        
        for (let j = 0; j < cols.length; j++) {
            row.push(cols[j].textContent.trim());
        }
        
        csv.push(row.join('\t'));
    }
    
    // Create Excel file (actually a TSV file that Excel can open)
    const csvFile = new Blob([csv.join('\n')], {type: 'application/vnd.ms-excel'});
    const downloadLink = document.createElement('a');
    
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Export table to PDF
function exportTableToPDF(tableId, filename) {
    // Show the terms and conditions modal
    const termsModal = new bootstrap.Modal(document.getElementById('termsModal'));
    termsModal.show();
    
    // Set up the generate PDF button
    document.getElementById('generatePdfWithTerms').addEventListener('click', function() {
        // Get terms and company information
        const companyName = document.getElementById('companyName').value;
        const companyAddress = document.getElementById('companyAddress').value;
        const companyContact = document.getElementById('companyContact').value;
        const reportNotes = document.getElementById('reportNotes').value;
        const termsText = document.getElementById('termsText').value;
        const signatureName = document.getElementById('signatureName').value;
        
        // Generate PDF with terms
        generatePDF(tableId, filename, {
            companyName,
            companyAddress,
            companyContact,
            reportNotes,
            termsText,
            signatureName
        });
        
        // Close the modal
        termsModal.hide();
    }, { once: true }); // Ensure event listener is only added once
}

// Generate PDF with jsPDF
function generatePDF(tableId, filename, terms) {
    // Access jsPDF from the global scope
    const { jsPDF } = window.jspdf;
    
    // Create a new PDF document - use A4 landscape format
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Set document properties
    doc.setProperties({
        title: filename,
        subject: 'Golden Niche IMS Report',
        author: 'Golden Niche IMS',
        keywords: 'report, inventory, transactions',
        creator: 'Golden Niche IMS'
    });
    
    // Calculate page dimensions
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 5; // Minimal margin to maximize table space
    const usableWidth = pageWidth - (margin * 2);
    
    // Add company header
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(terms.companyName, margin, margin + 5);
    doc.setFont(undefined, 'normal');
    
    doc.setFontSize(8);
    doc.text(terms.companyAddress, margin, margin + 10);
    doc.text(terms.companyContact, margin, margin + 14);
    
    // Add report title and date
    const isCustomReport = tableId === 'customReportTable';
    let reportTitle = isCustomReport ? 
        document.getElementById('reportDescription').textContent : 
        'Stock History Report';
    
    // Add horizontal line under company info
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 16, pageWidth - margin, margin + 16);
    
    // Add report title
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(reportTitle, margin, margin + 22);
    doc.setFont(undefined, 'normal');
    
    // Get report info
    let startY = margin + 26; // Increased spacing to prevent overlap
    if (isCustomReport) {
        const reportType = document.getElementById('reportType').value;
        
        // Get the supplier/client info
        let partyType = '';
        let partyName = '';
        let partyDetails = '';
        
        if (reportType === 'sales') {
            partyType = 'Customer';
            
            const clientSelect = document.getElementById('clientFilter');
            if (clientSelect.value !== 'all') {
                partyName = clientSelect.options[clientSelect.selectedIndex].text;
                
                // Get detailed client info if available
                const clients = window.MOCK_CLIENTS || [];
                const client = clients.find(c => c.name === partyName);
                if (client) {
                    partyDetails = `${client.contact_person || 'N/A'}, ${client.address || 'N/A'}`;
                }
            }
        } else if (reportType === 'purchases') {
            partyType = 'Supplier';
            
            const supplierSelect = document.getElementById('supplierFilter');
            if (supplierSelect.value !== 'all') {
                partyName = supplierSelect.options[supplierSelect.selectedIndex].text;
                
                // Get detailed supplier info if available
                const suppliers = window.MOCK_SUPPLIERS || [];
                const supplier = suppliers.find(s => s.name === partyName);
                if (supplier) {
                    partyDetails = `${supplier.contact_person || 'N/A'}, ${supplier.address || 'N/A'}`;
                }
            }
        }
        
        // Add supplier/customer info if available
        if (partyName) {
            doc.setFontSize(9);
            doc.text(`${partyType} : ${partyName} - ${partyDetails}`, margin, startY);
            startY += 5;
        }
        
        // Add report details - on separate lines to prevent overlap
        doc.setFontSize(9);
        doc.text(`Report Type : ${reportType === 'sales' ? 'Sales' : reportType === 'purchases' ? 'Purchase' : 'All Transactions'}`, margin, startY);
        startY += 5;
        
        // Add date range
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        doc.text(`From Date : ${formatDate(startDate)}`, margin, startY);
        startY += 5;
        doc.text(`To Date : ${formatDate(endDate)}`, margin, startY);
        startY += 6; // Extra spacing before table
    }
    
    // Add table data
    const table = document.getElementById(tableId);
    if (table) {
        console.log(`Extracting data from table: ${tableId}`);
        
        // Directly examine table structure
        const tableHeaders = table.querySelectorAll('thead th');
        const tableRows = table.querySelectorAll('tbody tr');
        
        console.log(`Table has ${tableHeaders.length} columns and ${tableRows.length} rows`);
        
        // Extract table headers and data
        let headers = [];
        const data = [];
        
        // Get headers
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
            headerRow.querySelectorAll('th').forEach(th => {
                headers.push(th.textContent.trim());
            });
            console.log('Headers:', headers);
        } else {
            console.error('No header row found in table');
            // Define default headers based on table type if none found
            if (isCustomReport) {
                headers = ['Date', 'Product', 'SKU', 'Transaction', 'Qty', 'UOM', 'Unit Price', 'Discount', 
                          'Total Price', 'Payable Amount', 'Supplier/Customer', 'Reference', 'Notes'];
            } else {
                headers = ['Date', 'Product', 'SKU', 'Transaction Type', 'Quantity', 'Notes'];
            }
        }
        
        // Get data rows
        const rows = table.querySelectorAll('tbody tr');
        console.log(`Found ${rows.length} data rows`);
        
        rows.forEach((tr, rowIndex) => {
            const rowData = [];
            tr.querySelectorAll('td').forEach((td, colIndex) => {
                // Strip HTML tags for plain text
                let text = td.textContent.trim();
                
                // Format money amounts to ensure they're properly aligned and have no spaces between digits
                // Check if this is a money column based on header name
                if (headers[colIndex] && (
                    headers[colIndex].includes('Price') || 
                    headers[colIndex].includes('Amount') || 
                    headers[colIndex].includes('Discount') || 
                    headers[colIndex].includes('Value'))) {
                    
                    // Remove all non-numeric characters except decimal point
                    text = text.replace(/[^\d.-]/g, '');
                    
                    // Convert to number and format with 2 decimal places, no spaces
                    if (!isNaN(parseFloat(text))) {
                        text = parseFloat(text).toFixed(2);
                    }
                }
                
                rowData.push(text);
            });
            
            if (rowData.length > 0) {
                data.push(rowData);
            }
        });
        
        console.log(`Processed ${data.length} rows of data`);
        
        // If no data rows were found, add a message
        if (data.length === 0) {
            data.push(['No transactions found matching the selected criteria']);
        }
        
        // Define column styles based on the table type and actual column count
        let columnStyles = {};
        
        if (isCustomReport) {
            if (headers.length === 13) { // Full custom report with all columns
                // Adjusted widths to maximize usage of A4 landscape (297mm width)
                // With 5mm margins on each side, we have 287mm usable width
                columnStyles = {
                    0: { cellWidth: 22 },   // Date
                    1: { cellWidth: 32 },   // Product
                    2: { cellWidth: 16 },   // SKU
                    3: { cellWidth: 20 },   // Transaction
                    4: { cellWidth: 12 },   // Qty
                    5: { cellWidth: 12 },   // UOM
                    6: { cellWidth: 18, halign: 'right' },  // Unit Price
                    7: { cellWidth: 18, halign: 'right' },  // Discount
                    8: { cellWidth: 22, halign: 'right' },  // Total Price
                    9: { cellWidth: 22, halign: 'right' },  // Payable Amount
                    10: { cellWidth: 33 },  // Supplier/Customer
                    11: { cellWidth: 22 },  // Reference
                    12: { cellWidth: 28 }   // Notes
                };
            } else {
                // For other column counts, distribute space evenly
                const colWidth = Math.floor(usableWidth / headers.length);
                headers.forEach((_, index) => {
                    columnStyles[index] = { cellWidth: colWidth };
                    // Make money columns right-aligned
                    if (headers[index] && (
                        headers[index].includes('Price') || 
                        headers[index].includes('Amount') || 
                        headers[index].includes('Discount') || 
                        headers[index].includes('Value'))) {
                        columnStyles[index].halign = 'right';
                    }
                });
            }
        } else {
            // Stock history table - default 6 columns
            if (headers.length === 6) {
                // Maximize column widths for stock history
                columnStyles = {
                    0: { cellWidth: 40 },  // Date
                    1: { cellWidth: 90 },  // Product
                    2: { cellWidth: 35 },  // SKU
                    3: { cellWidth: 35 },  // Transaction type
                    4: { cellWidth: 27 },  // Quantity
                    5: { cellWidth: 60 }   // Notes
                };
            } else {
                // For other column counts, distribute space evenly
                const colWidth = Math.floor(usableWidth / headers.length);
                headers.forEach((_, index) => {
                    columnStyles[index] = { cellWidth: colWidth };
                });
            }
        }
        
        // Add table to PDF using autoTable
        try {
            // Make sure headers are defined and properly formatted
            const headRows = [headers.map(header => ({
                content: header,
                styles: {
                    fillColor: [240, 240, 240],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 8
                }
            }))];
            
            doc.autoTable({
                head: headRows,
                body: data,
                startY: startY + 5,
                theme: 'grid',
                headStyles: {
                    fillColor: [240, 240, 240],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 8
                },
                styles: {
                    fontSize: 7,
                    cellPadding: { top: 1, right: 1, bottom: 1, left: 1 }, // Reduced padding to fit more content
                    overflow: 'linebreak',
                    lineWidth: 0.1,
                    valign: 'middle'
                },
                columnStyles: columnStyles,
                margin: { top: margin, right: margin, bottom: margin, left: margin },
                tableWidth: usableWidth, // Use full available width
                didDrawPage: function(data) {
                    // Add header to each page
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text(terms.companyName, margin, 5);
                    doc.text(reportTitle, pageWidth/2, 5, { align: 'center' });
                    doc.text(`Page ${data.pageNumber}`, pageWidth - margin, 5, { align: 'right' });
                    
                    // Add footer with page number
                    doc.text(`Page ${data.pageNumber} of ${doc.getNumberOfPages()}`, pageWidth/2, pageHeight - 5, { align: 'center' });
                },
                didDrawCell: function(data) {
                    // Ensure header cells are properly styled and visible
                    if (data.section === 'head') {
                        const doc = data.doc;
                        const cell = data.cell;
                        
                        // Add border to header cells to make them more visible
                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(0.1);
                        doc.rect(cell.x, cell.y, cell.width, cell.height);
                    }
                }
            });
            console.log('Table added to PDF');
        } catch (error) {
            console.error('Error adding table to PDF:', error);
            
            // Fallback method if autoTable fails
            doc.setFontSize(10);
            doc.text('Transaction Data:', margin, startY);
            startY += 10;
            
            // Add headers manually
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text(headers.join(' | '), margin, startY);
            doc.setFont(undefined, 'normal');
            startY += 5;
            
            // Add separator line
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margin, startY, pageWidth - margin, startY);
            startY += 5;
            
            // Add data rows
            doc.setFontSize(8);
            data.forEach(row => {
                if (startY > pageHeight - 20) {
                    doc.addPage();
                    
                    // Add headers to new page
                    startY = 20;
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'bold');
                    doc.text(headers.join(' | '), margin, startY);
                    doc.setFont(undefined, 'normal');
                    startY += 5;
                    
                    // Add separator line
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.5);
                    doc.line(margin, startY, pageWidth - margin, startY);
                    startY += 5;
                    
                    doc.setFontSize(8);
                }
                doc.text(row.join(' | '), margin, startY);
                startY += 4;
            });
        }
    } else {
        console.error(`Table with ID ${tableId} not found`);
    }
    
    // Get the final Y position after the table
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : startY + 20;
    
    // Check if we need a new page for terms and conditions
    if (finalY > pageHeight - 60) {
        doc.addPage();
        
        // Reset Y position for the new page
        startY = margin + 10;
    } else {
        startY = finalY + 10;
    }
    
    // Add Notes section
    if (terms.reportNotes && terms.reportNotes.trim() !== '') {
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Notes:', margin, startY);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        
        const splitNotes = doc.splitTextToSize(terms.reportNotes, usableWidth - 20);
        doc.text(splitNotes, margin + 5, startY + 5);
        
        startY += 10 + (splitNotes.length * 3.5);
    }
    
    // Add Terms and Conditions section if provided
    if (terms.termsText && terms.termsText.trim() !== '') {
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Terms & Conditions:', margin, startY);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        
        const splitTerms = doc.splitTextToSize(terms.termsText, usableWidth - 20);
        doc.text(splitTerms, margin + 5, startY + 5);
        
        startY += 15 + (splitTerms.length * 3.5);
    }
    
    // Add signature line at the bottom of the last page
    const lastPage = doc.getNumberOfPages();
    doc.setPage(lastPage);
    
    const signatureY = pageHeight - 25;
    doc.line(margin, signatureY, margin + 50, signatureY);
    doc.setFontSize(8);
    doc.text("Authorized Signature", margin, signatureY + 5);
    
    // Add page numbers to all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Printed By: ${terms.signatureName}`, margin, pageHeight - 5);
        doc.text(`Printed Date: ${new Date().toLocaleString()}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }
    
    // Save the PDF
    doc.save(filename);
} 