// Demo Mode - Mock database for testing without real database
require('dotenv').config();
const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1' || true; // Force enable for now

// Log status
if (DEMO_MODE) {
    console.log('✅ Demo Mode is ACTIVE');
}

// Mock users data
const mockUsers = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@webpanel.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // admin123
        role: 'admin',
        balance: 1000.00,
        status: 'active'
    },
    {
        id: 2,
        username: 'seller1',
        email: 'seller@webpanel.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // admin123
        role: 'seller',
        balance: 500.00,
        status: 'active'
    },
    {
        id: 3,
        username: 'client1',
        email: 'client@webpanel.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // admin123
        role: 'client',
        balance: 100.00,
        status: 'active'
    }
];

// Mock services
const mockServices = [
    {
        id: 1,
        category_id: 1,
        category_name: 'Instagram',
        name: 'Instagram Followers',
        description: 'High quality Instagram followers',
        price: 0.01,
        reseller_price: 0.008,
        min_quantity: 100,
        max_quantity: 10000,
        speed: 'fast',
        status: 'active'
    },
    {
        id: 2,
        category_id: 1,
        category_name: 'Instagram',
        name: 'Instagram Likes',
        description: 'Real Instagram likes',
        price: 0.005,
        reseller_price: 0.004,
        min_quantity: 50,
        max_quantity: 5000,
        speed: 'very_fast',
        status: 'active'
    },
    {
        id: 3,
        category_id: 2,
        category_name: 'YouTube',
        name: 'YouTube Subscribers',
        description: 'Real YouTube subscribers',
        price: 0.02,
        reseller_price: 0.015,
        min_quantity: 100,
        max_quantity: 10000,
        speed: 'fast',
        status: 'active'
    }
];

// Mock categories
const mockCategories = [
    { id: 1, name: 'Instagram', description: 'Instagram services', status: 'active' },
    { id: 2, name: 'YouTube', description: 'YouTube services', status: 'active' },
    { id: 3, name: 'Twitter', description: 'Twitter services', status: 'active' },
    { id: 4, name: 'TikTok', description: 'TikTok services', status: 'active' },
    { id: 5, name: 'Facebook', description: 'Facebook services', status: 'active' }
];

// Mock orders
let mockOrders = [
    {
        id: 1,
        user_id: 3,
        service_id: 1,
        service_name: 'Instagram Followers',
        category_name: 'Instagram',
        link: 'https://instagram.com/test',
        quantity: 1000,
        price: 10.00,
        status: 'completed',
        start_count: 5000,
        remains: 0,
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        user_id: 3,
        service_id: 2,
        service_name: 'Instagram Likes',
        category_name: 'Instagram',
        link: 'https://instagram.com/test2',
        quantity: 500,
        price: 2.50,
        status: 'pending',
        start_count: 0,
        remains: 500,
        created_at: new Date().toISOString()
    }
];

// Mock tickets
let mockTickets = [
    {
        id: 1,
        user_id: 3,
        subject: 'Order Issue',
        status: 'open',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

// Mock ticket messages
let mockTicketMessages = [
    {
        id: 1,
        ticket_id: 1,
        user_id: 3,
        message: 'My order is not completing',
        is_admin: false,
        created_at: new Date().toISOString(),
        username: 'client1',
        email: 'client@webpanel.com'
    }
];

// Mock functions
const mockDB = {
    users: [...mockUsers],
    services: [...mockServices],
    categories: [...mockCategories],
    orders: [...mockOrders],
    transactions: [],
    tickets: [...mockTickets],
    ticketMessages: [...mockTicketMessages],
    
    // Find user by email
    findUserByEmail: (email) => {
        return mockDB.users.find(u => u.email === email);
    },
    
    // Find user by id
    findUserById: (id) => {
        return mockDB.users.find(u => u.id === parseInt(id));
    },
    
    // Create user
    createUser: (userData) => {
        const newUser = {
            id: mockDB.users.length + 1,
            ...userData,
            balance: 0.00,
            status: 'active',
            created_at: new Date().toISOString()
        };
        mockDB.users.push(newUser);
        return { insertId: newUser.id };
    },
    
    // Get services
    getServices: (filters = {}) => {
        let services = [...mockDB.services];
        if (filters.category_id) {
            services = services.filter(s => s.category_id === parseInt(filters.category_id));
        }
        if (filters.search) {
            const search = filters.search.toLowerCase();
            services = services.filter(s => 
                s.name.toLowerCase().includes(search) || 
                s.description.toLowerCase().includes(search)
            );
        }
        return services;
    },
    
    // Get categories
    getCategories: () => {
        return [...mockDB.categories];
    },
    
    // Get orders
    getOrders: (userId, filters = {}) => {
        let orders = mockDB.orders.filter(o => o.user_id === userId);
        if (filters.status) {
            orders = orders.filter(o => o.status === filters.status);
        }
        return orders;
    },
    
    // Create order
    createOrder: (orderData) => {
        const service = mockDB.services.find(s => s.id === orderData.service_id);
        const newOrder = {
            id: mockDB.orders.length + 1,
            ...orderData,
            service_name: service?.name || 'Unknown',
            category_name: service?.category_name || 'Unknown',
            price: (service?.price || 0) * orderData.quantity,
            status: 'pending',
            start_count: 0,
            remains: orderData.quantity,
            created_at: new Date().toISOString()
        };
        mockDB.orders.push(newOrder);
        return { insertId: newOrder.id };
    },
    
    // Get tickets
    getTickets: (userId, filters = {}) => {
        let tickets = mockDB.tickets.filter(t => t.user_id === userId);
        if (filters.status) {
            tickets = tickets.filter(t => t.status === filters.status);
        }
        return tickets;
    },
    
    // Create ticket
    createTicket: (ticketData) => {
        const newTicket = {
            id: mockDB.tickets.length + 1,
            ...ticketData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        mockDB.tickets.push(newTicket);
        return { insertId: newTicket.id };
    },
    
    // Get ticket messages
    getTicketMessages: (ticketId) => {
        return mockDB.ticketMessages.filter(m => m.ticket_id === ticketId);
    },
    
    // Add ticket message
    addTicketMessage: (messageData) => {
        const user = mockDB.findUserById(messageData.user_id);
        const newMessage = {
            id: mockDB.ticketMessages.length + 1,
            ...messageData,
            username: user?.username || 'Unknown',
            email: user?.email || 'unknown@example.com',
            created_at: new Date().toISOString()
        };
        mockDB.ticketMessages.push(newMessage);
        return { insertId: newMessage.id };
    }
};

module.exports = {
    DEMO_MODE,
    mockDB
};

