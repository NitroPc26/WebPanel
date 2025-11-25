const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { DEMO_MODE, mockDB } = require('../config/demo-mode');

// Get dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let stats = {};

        // Demo Mode
        if (DEMO_MODE) {
            if (role === 'client') {
                const user = mockDB.findUserById(userId);
                const orders = mockDB.getOrders(userId);
                
                stats = {
                    total_orders: orders.length,
                    pending_orders: orders.filter(o => o.status === 'pending').length,
                    completed_orders: orders.filter(o => o.status === 'completed').length,
                    failed_orders: orders.filter(o => o.status === 'canceled').length,
                    total_spent: orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.price, 0),
                    balance: parseFloat(user?.balance || 0)
                };
            } else if (role === 'seller') {
                const user = mockDB.findUserById(userId);
                const orders = mockDB.orders.filter(o => o.seller_id === userId);
                
                stats = {
                    total_orders: orders.length,
                    pending_orders: orders.filter(o => o.status === 'pending').length,
                    completed_orders: orders.filter(o => o.status === 'completed').length,
                    in_progress_orders: orders.filter(o => o.status === 'in_progress').length,
                    balance: parseFloat(user?.balance || 0)
                };
            } else if (role === 'admin') {
                stats = {
                    total_orders: mockDB.orders.length,
                    pending_orders: mockDB.orders.filter(o => o.status === 'pending').length,
                    completed_orders: mockDB.orders.filter(o => o.status === 'completed').length,
                    failed_orders: mockDB.orders.filter(o => o.status === 'canceled').length,
                    total_users: mockDB.users.length,
                    clients: mockDB.users.filter(u => u.role === 'client').length,
                    sellers: mockDB.users.filter(u => u.role === 'seller').length,
                    total_revenue: mockDB.orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.price, 0)
                };
            }
            
            return res.json({
                success: true,
                stats
            });
        }

        // Real Mode
        if (role === 'client') {
            // Client dashboard stats
            const [orders] = await pool.execute(
                `SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                    SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as failed_orders,
                    SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as total_spent
                FROM orders WHERE user_id = ?`,
                [userId]
            );

            const [balance] = await pool.execute(
                'SELECT balance FROM users WHERE id = ?',
                [userId]
            );

            stats = {
                total_orders: orders[0].total_orders || 0,
                pending_orders: orders[0].pending_orders || 0,
                completed_orders: orders[0].completed_orders || 0,
                failed_orders: orders[0].failed_orders || 0,
                total_spent: parseFloat(orders[0].total_spent || 0),
                balance: parseFloat(balance[0].balance || 0)
            };
        } else if (role === 'seller') {
            // Seller dashboard stats
            const [orders] = await pool.execute(
                `SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_orders
                FROM orders WHERE seller_id = ?`,
                [userId]
            );

            const [balance] = await pool.execute(
                'SELECT balance FROM users WHERE id = ?',
                [userId]
            );

            stats = {
                total_orders: orders[0].total_orders || 0,
                pending_orders: orders[0].pending_orders || 0,
                completed_orders: orders[0].completed_orders || 0,
                in_progress_orders: orders[0].in_progress_orders || 0,
                balance: parseFloat(balance[0].balance || 0)
            };
        } else if (role === 'admin') {
            // Admin dashboard stats
            const [orders] = await pool.execute(
                `SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                    SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as failed_orders
                FROM orders`
            );

            const [users] = await pool.execute(
                `SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as clients,
                    SUM(CASE WHEN role = 'seller' THEN 1 ELSE 0 END) as sellers
                FROM users`
            );

            const [revenue] = await pool.execute(
                "SELECT SUM(price) as total_revenue FROM orders WHERE status = 'completed'"
            );

            stats = {
                total_orders: orders[0].total_orders || 0,
                pending_orders: orders[0].pending_orders || 0,
                completed_orders: orders[0].completed_orders || 0,
                failed_orders: orders[0].failed_orders || 0,
                total_users: users[0].total_users || 0,
                clients: users[0].clients || 0,
                sellers: users[0].sellers || 0,
                total_revenue: parseFloat(revenue[0].total_revenue || 0)
            };
        }

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics'
        });
    }
});

// Get recent orders
router.get('/recent-orders', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const limit = parseInt(req.query.limit) || 10;

        let query = '';
        let params = [];

        if (role === 'client') {
            query = `
                SELECT o.*, s.name as service_name, c.name as category_name
                FROM orders o
                JOIN services s ON o.service_id = s.id
                JOIN categories c ON s.category_id = c.id
                WHERE o.user_id = ?
                ORDER BY o.created_at DESC
                LIMIT ?
            `;
            params = [userId, limit];
        } else if (role === 'seller') {
            query = `
                SELECT o.*, s.name as service_name, c.name as category_name, u.username as client_username
                FROM orders o
                JOIN services s ON o.service_id = s.id
                JOIN categories c ON s.category_id = c.id
                JOIN users u ON o.user_id = u.id
                WHERE o.seller_id = ?
                ORDER BY o.created_at DESC
                LIMIT ?
            `;
            params = [userId, limit];
        } else if (role === 'admin') {
            query = `
                SELECT o.*, s.name as service_name, c.name as category_name, u.username as client_username
                FROM orders o
                JOIN services s ON o.service_id = s.id
                JOIN categories c ON s.category_id = c.id
                JOIN users u ON o.user_id = u.id
                ORDER BY o.created_at DESC
                LIMIT ?
            `;
            params = [limit];
        }

        const [orders] = await pool.execute(query, params);

        res.json({
            success: true,
            orders: orders.map(order => ({
                ...order,
                price: parseFloat(order.price),
                quantity: parseInt(order.quantity),
                start_count: parseInt(order.start_count || 0),
                remains: parseInt(order.remains || 0)
            }))
        });
    } catch (error) {
        console.error('Recent orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent orders'
        });
    }
});

module.exports = router;

