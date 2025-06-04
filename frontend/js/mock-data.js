// mock-data.js - Mock data for Golden Niche IMS when API is not available

// Mock products data
const MOCK_PRODUCTS = [
    {
        id: 'p1',
        name: 'Smartphone X',
        sku: 'SP-001',
        description: 'Latest smartphone model with advanced features',
        price: 45000,
        cost: 38000,
        quantity: 25,
        type: 'Electronics',
        min_stock: 5,
        uom: 'Unit'
    },
    {
        id: 'p2',
        name: 'Laptop Pro',
        sku: 'LP-002',
        description: 'High-performance laptop for professionals',
        price: 85000,
        cost: 70000,
        quantity: 12,
        type: 'Electronics',
        min_stock: 3,
        uom: 'Unit'
    },
    {
        id: 'p3',
        name: 'Office Desk',
        sku: 'FN-003',
        description: 'Ergonomic office desk',
        price: 12000,
        cost: 8500,
        quantity: 8,
        type: 'Furniture',
        min_stock: 2,
        uom: 'Piece'
    },
    {
        id: 'p4',
        name: 'Premium Coffee',
        sku: 'GR-004',
        description: 'Premium coffee beans',
        price: 850,
        cost: 550,
        quantity: 50,
        type: 'Grocery',
        min_stock: 10,
        uom: 'kg'
    },
    {
        id: 'p5',
        name: 'Wireless Headphones',
        sku: 'SP-005',
        description: 'Noise-cancelling wireless headphones',
        price: 3500,
        cost: 2200,
        quantity: 30,
        type: 'Electronics',
        min_stock: 5,
        uom: 'Unit'
    }
];

// Mock suppliers data
const MOCK_SUPPLIERS = [
    {
        id: 's1',
        name: 'Tech Distributors Ltd.',
        contact_person: 'Ahmed Khan',
        phone: '01712345678',
        email: 'info@techdist.com',
        address: '123 Tech Street, Dhaka'
    },
    {
        id: 's2',
        name: 'Global Imports Inc.',
        contact_person: 'Sarah Rahman',
        phone: '01812345678',
        email: 'contact@globalimports.com',
        address: '456 Import Avenue, Chattogram'
    },
    {
        id: 's3',
        name: 'Furniture World',
        contact_person: 'Kamal Hossain',
        phone: '01912345678',
        email: 'sales@furnitureworld.com',
        address: '789 Furniture Road, Sylhet'
    }
];

// Mock clients data
const MOCK_CLIENTS = [
    {
        id: 'c1',
        name: 'ABC Corporation',
        contact_person: 'Rahim Ahmed',
        phone: '01612345678',
        email: 'info@abccorp.com',
        address: '101 Business Park, Dhaka'
    },
    {
        id: 'c2',
        name: 'XYZ Enterprises',
        contact_person: 'Fatima Begum',
        phone: '01512345678',
        email: 'contact@xyzent.com',
        address: '202 Enterprise Zone, Khulna'
    },
    {
        id: 'c3',
        name: 'Local Retail Shop',
        contact_person: 'Jamal Uddin',
        phone: '01312345678',
        email: 'shop@localretail.com',
        address: '303 Retail Street, Rajshahi'
    }
];

// Mock stock history data
const MOCK_STOCK_HISTORY = [
    {
        id: 't1',
        product: 'p1',
        product_name: 'Smartphone X',
        quantity: 10,
        type: 'IN',
        date: '2025-06-01T10:30:00',
        notes: 'Initial stock',
        supplier: 's1',
        supplier_name: 'Tech Distributors Ltd.',
        reference_number: 'PO-2025-001',
        discount: 2000,
        uom: 'Unit'
    },
    {
        id: 't2',
        product: 'p2',
        product_name: 'Laptop Pro',
        quantity: 5,
        type: 'IN',
        date: '2025-06-01T11:45:00',
        notes: 'Initial stock',
        supplier: 's1',
        supplier_name: 'Tech Distributors Ltd.',
        reference_number: 'PO-2025-002',
        discount: 5000,
        uom: 'Unit'
    },
    {
        id: 't3',
        product: 'p3',
        product_name: 'Office Desk',
        quantity: 3,
        type: 'IN',
        date: '2025-06-02T09:15:00',
        notes: 'Initial stock',
        supplier: 's3',
        supplier_name: 'Furniture World',
        reference_number: 'PO-2025-003',
        discount: 0,
        uom: 'Piece'
    },
    {
        id: 't4',
        product: 'p1',
        product_name: 'Smartphone X',
        quantity: 2,
        type: 'OUT',
        date: '2025-06-03T14:20:00',
        notes: 'Regular sale',
        client: 'c1',
        client_name: 'ABC Corporation',
        reference_number: 'SO-2025-001',
        discount: 1000,
        uom: 'Unit'
    },
    {
        id: 't5',
        product: 'p2',
        product_name: 'Laptop Pro',
        quantity: 1,
        type: 'OUT',
        date: '2025-06-03T16:30:00',
        notes: 'Regular sale',
        client: 'c2',
        client_name: 'XYZ Enterprises',
        reference_number: 'SO-2025-002',
        discount: 2000,
        uom: 'Unit'
    },
    {
        id: 't6',
        product: 'p4',
        product_name: 'Premium Coffee',
        quantity: 20,
        type: 'IN',
        date: '2025-06-04T10:00:00',
        notes: 'Regular stock',
        supplier: 's2',
        supplier_name: 'Global Imports Inc.',
        reference_number: 'PO-2025-004',
        discount: 500,
        uom: 'kg'
    },
    {
        id: 't7',
        product: 'p4',
        product_name: 'Premium Coffee',
        quantity: 5,
        type: 'OUT',
        date: '2025-06-05T11:15:00',
        notes: 'Regular sale',
        client: 'c3',
        client_name: 'Local Retail Shop',
        reference_number: 'SO-2025-003',
        discount: 200,
        uom: 'kg'
    },
    {
        id: 't8',
        product: 'p5',
        product_name: 'Wireless Headphones',
        quantity: 15,
        type: 'IN',
        date: '2025-06-05T13:45:00',
        notes: 'Initial stock',
        supplier: 's1',
        supplier_name: 'Tech Distributors Ltd.',
        reference_number: 'PO-2025-005',
        discount: 1500,
        uom: 'Unit'
    },
    {
        id: 't9',
        product: 'p5',
        product_name: 'Wireless Headphones',
        quantity: 3,
        type: 'OUT',
        date: '2025-06-06T09:30:00',
        notes: 'Regular sale',
        client: 'c1',
        client_name: 'ABC Corporation',
        reference_number: 'SO-2025-004',
        discount: 300,
        uom: 'Unit'
    },
    {
        id: 't10',
        product: 'p3',
        product_name: 'Office Desk',
        quantity: 1,
        type: 'OUT',
        date: '2025-06-06T14:00:00',
        notes: 'Regular sale',
        client: 'c2',
        client_name: 'XYZ Enterprises',
        reference_number: 'SO-2025-005',
        discount: 500,
        uom: 'Piece'
    }
];

// Mock inventory stats
const MOCK_INVENTORY_STATS = {
    total_products: MOCK_PRODUCTS.length,
    total_value: MOCK_PRODUCTS.reduce((sum, product) => sum + (product.price * product.quantity), 0),
    low_stock_count: MOCK_PRODUCTS.filter(product => product.quantity <= product.min_stock).length
};

// Override API functions with mock data when API is not available
function setupMockData() {
    console.log('Using mock data instead of API');
    
    // Override getProducts
    window.getProducts = async function() {
        return [...MOCK_PRODUCTS];
    };
    
    // Override getProductById
    window.getProductById = async function(id) {
        const product = MOCK_PRODUCTS.find(p => p.id === id);
        if (!product) {
            throw new Error('Product not found');
        }
        return {...product};
    };
    
    // Override getStockHistory
    window.getStockHistory = async function() {
        return [...MOCK_STOCK_HISTORY];
    };
    
    // Override getInventoryStats
    window.getInventoryStats = async function() {
        return {...MOCK_INVENTORY_STATS};
    };
    
    // Override getSuppliers
    window.getSuppliers = async function() {
        return [...MOCK_SUPPLIERS];
    };
    
    // Override getClients
    window.getClients = async function() {
        return [...MOCK_CLIENTS];
    };
}

// Check if API is available, otherwise use mock data
document.addEventListener('DOMContentLoaded', function() {
    // Check if API_CONFIG exists and is accessible
    if (typeof API_CONFIG === 'undefined' || !API_CONFIG.BASE_URL) {
        setupMockData();
    } else {
        // Test API connection
        fetch(API_CONFIG.BASE_URL + '/ping')
            .then(response => {
                if (!response.ok) {
                    throw new Error('API not available');
                }
                return response.json();
            })
            .then(data => {
                console.log('API is available:', data);
            })
            .catch(error => {
                console.warn('API not available, using mock data:', error);
                setupMockData();
            });
    }
}); 