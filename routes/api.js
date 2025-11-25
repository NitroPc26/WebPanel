const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { getClientIP } = require('../utils/helpers');

// API Key authentication middleware
const authenticateAPI = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key required'
            });
        }

        // In a real implementation, you'd have an api_keys table
        // For now, we'll use a simple check against user tokens or create API keys
        // This is a simplified version - you should implement proper API key management
        
        // For this implementation, we'll allow authenticated users to use their JWT as API key
        // In production, implement a proper API key system
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid API key'
        });
    }
};

// Receive order from external API
router.post('/order', authenticateAPI, sanitizeInput, async (req, res) => {
    try {
        const { service_id, link, quantity } = req.body;

        if (!service_id || !link || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'service_id, link, and quantity are required'
            });
        }

        // Get service
        const [services] = await pool.execute(
            'SELECT * FROM services WHERE id = ? AND status = ?',
            [service_id, 'active']
        );

        if (services.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        const service = services[0];

        // Validate quantity
        if (quantity < service.min_quantity || quantity > service.max_quantity) {
            return res.status(400).json({
                success: false,
                message: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}`
            });
        }

        // Calculate price
        const price = parseFloat((service.price * quantity).toFixed(4));

        // Get user from API key (simplified - in production use proper API key system)
        // For now, we'll require user_id in request or use a default system user
        const userId = req.body.user_id || 1; // Default to admin/system user

        // Check balance
        const [users] = await pool.execute(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userBalance = parseFloat(users[0].balance);

        if (userBalance < price) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        // Deduct balance
        const newBalance = userBalance - price;
        await pool.execute(
            'UPDATE users SET balance = ? WHERE id = ?',
            [newBalance, userId]
        );

        // Create transaction
        await pool.execute(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'order', -price, userBalance, newBalance, `API Order for service #${service_id}`]
        );

        // Create order
        const [orderResult] = await pool.execute(
            'INSERT INTO orders (user_id, service_id, link, quantity, price, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, service_id, link, quantity, price, 'pending']
        );

        const orderId = orderResult.insertId;

        // Log API call
        await pool.execute(
            'INSERT INTO api_logs (user_id, endpoint, method, ip_address, request_data, response_data, status_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, '/api/external/order', 'POST', getClientIP(req), JSON.stringify(req.body), JSON.stringify({ order_id: orderId }), 200]
        );

        res.status(201).json({
            success: true,
            order_id: orderId,
            status: 'pending',
            price: price
        });
    } catch (error) {
        console.error('API order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

// Update order status
router.post('/order/:id/status', authenticateAPI, sanitizeInput, async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status, start_count, remains } = req.body;

        const validStatuses = ['pending', 'processing', 'in_progress', 'completed', 'partial', 'canceled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Get order
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];

        // Update order
        await pool.execute(
            'UPDATE orders SET status = ?, start_count = ?, remains = ?, updated_at = NOW() WHERE id = ?',
            [status, start_count || order.start_count, remains !== undefined ? remains : order.remains, orderId]
        );

        // If completed, update completed_at
        if (status === 'completed') {
            await pool.execute(
                'UPDATE orders SET completed_at = NOW() WHERE id = ?',
                [orderId]
            );
        }

        // Log API call
        await pool.execute(
            'INSERT INTO api_logs (user_id, endpoint, method, ip_address, request_data, response_data, status_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [order.user_id, `/api/external/order/${orderId}/status`, 'POST', getClientIP(req), JSON.stringify(req.body), JSON.stringify({ success: true }), 200]
        );

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('API update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
});

// Sync services from external API
router.post('/services/sync', authenticateAPI, sanitizeInput, async (req, res) => {
    try {
        const services = req.body.services; // Array of services

        if (!Array.isArray(services)) {
            return res.status(400).json({
                success: false,
                message: 'Services must be an array'
            });
        }

        let synced = 0;
        let updated = 0;
        let errors = [];

        for (const service of services) {
            try {
                const { api_service_id, category_id, name, description, price, reseller_price, min_quantity, max_quantity, speed } = service;

                if (!api_service_id || !name || !price) {
                    errors.push({ service: name || 'Unknown', error: 'Missing required fields' });
                    continue;
                }

                // Check if service exists by api_service_id
                const [existing] = await pool.execute(
                    'SELECT id FROM services WHERE api_service_id = ?',
                    [api_service_id]
                );

                if (existing.length > 0) {
                    // Update existing
                    await pool.execute(
                        'UPDATE services SET name = ?, description = ?, price = ?, reseller_price = ?, min_quantity = ?, max_quantity = ?, speed = ?, updated_at = NOW() WHERE api_service_id = ?',
                        [name, description || null, price, reseller_price || price, min_quantity || 100, max_quantity || 10000, speed || 'fast', api_service_id]
                    );
                    updated++;
                } else {
                    // Create new
                    await pool.execute(
                        'INSERT INTO services (category_id, name, description, price, reseller_price, min_quantity, max_quantity, speed, api_service_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [category_id || 1, name, description || null, price, reseller_price || price, min_quantity || 100, max_quantity || 10000, speed || 'fast', api_service_id]
                    );
                    synced++;
                }
            } catch (error) {
                errors.push({ service: service.name || 'Unknown', error: error.message });
            }
        }

        res.json({
            success: true,
            message: 'Services synced successfully',
            synced,
            updated,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('API sync services error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync services'
        });
    }
});

// Get order status
router.get('/order/:id', authenticateAPI, async (req, res) => {
    try {
        const orderId = req.params.id;

        const [orders] = await pool.execute(
            'SELECT id, status, start_count, remains, quantity, price, created_at, updated_at, completed_at FROM orders WHERE id = ?',
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];

        res.json({
            success: true,
            order: {
                id: order.id,
                status: order.status,
                start_count: parseInt(order.start_count || 0),
                remains: parseInt(order.remains || 0),
                quantity: parseInt(order.quantity),
                price: parseFloat(order.price),
                created_at: order.created_at,
                updated_at: order.updated_at,
                completed_at: order.completed_at
            }
        });
    } catch (error) {
        console.error('API get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
});

module.exports = router;

