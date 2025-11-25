const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateOrder, sanitizeInput } = require('../middleware/validation');
const { calculateOrderPrice, logAction } = require('../utils/helpers');
const { paginate } = require('../utils/helpers');
const { DEMO_MODE, mockDB } = require('../config/demo-mode');

// Create new order (Client)
router.post('/', authenticate, authorize('client'), sanitizeInput, validateOrder, async (req, res) => {
    try {
        const { service_id, link, quantity, coupon_code } = req.body;
        const userId = req.user.id;

        // Get service details
        const [services] = await pool.execute(
            'SELECT id, price, reseller_price, min_quantity, max_quantity, status FROM services WHERE id = ?',
            [service_id]
        );

        if (services.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        const service = services[0];

        if (service.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Service is not available'
            });
        }

        // Validate quantity
        if (quantity < service.min_quantity || quantity > service.max_quantity) {
            return res.status(400).json({
                success: false,
                message: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}`
            });
        }

        // Calculate price
        let orderPrice = calculateOrderPrice(service.price, quantity);
        let discountAmount = 0;

        // Apply coupon if provided
        if (coupon_code) {
            const [coupons] = await pool.execute(
                'SELECT * FROM coupons WHERE code = ? AND status = ? AND (valid_from IS NULL OR valid_from <= NOW()) AND (valid_until IS NULL OR valid_until >= NOW())',
                [coupon_code, 'active']
            );

            if (coupons.length > 0) {
                const coupon = coupons[0];
                const usageCount = coupon.used_count || 0;

                if (!coupon.usage_limit || usageCount < coupon.usage_limit) {
                    if (coupon.discount_type === 'percentage') {
                        discountAmount = (orderPrice * coupon.discount_value) / 100;
                        if (coupon.max_discount && discountAmount > coupon.max_discount) {
                            discountAmount = coupon.max_discount;
                        }
                    } else {
                        discountAmount = coupon.discount_value;
                    }

                    orderPrice = Math.max(0, orderPrice - discountAmount);
                }
            }
        }

        // Check user balance
        const [users] = await pool.execute(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );

        const userBalance = parseFloat(users[0].balance);

        if (userBalance < orderPrice) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance',
                required: orderPrice,
                available: userBalance
            });
        }

        // Deduct balance
        const newBalance = userBalance - orderPrice;
        await pool.execute(
            'UPDATE users SET balance = ? WHERE id = ?',
            [newBalance, userId]
        );

        // Create transaction record
        await pool.execute(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'order', -orderPrice, userBalance, newBalance, `Order for service #${service_id}`]
        );

        // Create order
        const [orderResult] = await pool.execute(
            'INSERT INTO orders (user_id, service_id, link, quantity, price, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, service_id, link, quantity, orderPrice, 'pending']
        );

        const orderId = orderResult.insertId;

        // Record coupon usage if applicable
        if (coupon_code && discountAmount > 0) {
            const [coupons] = await pool.execute(
                'SELECT id FROM coupons WHERE code = ?',
                [coupon_code]
            );
            if (coupons.length > 0) {
                await pool.execute(
                    'INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)',
                    [coupons[0].id, userId, orderId, discountAmount]
                );
                await pool.execute(
                    'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
                    [coupons[0].id]
                );
            }
        }

        // Log action
        logAction(userId, 'order_created', { order_id: orderId, service_id, quantity, price: orderPrice });

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: {
                id: orderId,
                service_id,
                link,
                quantity,
                price: orderPrice,
                status: 'pending'
            }
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

// Get user orders
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { page = 1, limit = 20, status, search } = req.query;
        const { offset, limit: limitNum } = paginate(page, limit);

        // Demo Mode
        if (DEMO_MODE) {
            let orders = [];
            if (role === 'client') {
                orders = mockDB.getOrders(userId, { status });
            } else if (role === 'seller') {
                orders = mockDB.orders.filter(o => o.seller_id === userId);
                if (status) {
                    orders = orders.filter(o => o.status === status);
                }
            } else if (role === 'admin') {
                orders = [...mockDB.orders];
                if (status) {
                    orders = orders.filter(o => o.status === status);
                }
            }

            // Apply pagination
            const total = orders.length;
            orders = orders.slice(offset, offset + limitNum);

            return res.json({
                success: true,
                orders: orders.map(order => ({
                    ...order,
                    price: parseFloat(order.price),
                    quantity: parseInt(order.quantity),
                    start_count: parseInt(order.start_count || 0),
                    remains: parseInt(order.remains || 0)
                })),
                pagination: {
                    page: parseInt(page),
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });
        }

        // Real Mode
        let query = '';
        let countQuery = '';
        let params = [];
        let countParams = [];

        if (role === 'client') {
            query = `
                SELECT o.*, s.name as service_name, s.description as service_description, 
                       c.name as category_name, c.id as category_id
                FROM orders o
                JOIN services s ON o.service_id = s.id
                JOIN categories c ON s.category_id = c.id
                WHERE o.user_id = ?
            `;
            countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
            params = [userId];
            countParams = [userId];

            if (status) {
                query += ' AND o.status = ?';
                countQuery += ' AND status = ?';
                params.push(status);
                countParams.push(status);
            }

            if (search) {
                query += ' AND (s.name LIKE ? OR o.link LIKE ?)';
                countQuery += ' AND (EXISTS(SELECT 1 FROM services s WHERE s.id = orders.service_id AND s.name LIKE ?) OR link LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm);
                countParams.push(searchTerm, searchTerm);
            }

            query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
            params.push(limitNum, offset);
        } else if (role === 'seller') {
            query = `
                SELECT o.*, s.name as service_name, c.name as category_name, 
                       u.username as client_username, u.email as client_email
                FROM orders o
                JOIN services s ON o.service_id = s.id
                JOIN categories c ON s.category_id = c.id
                JOIN users u ON o.user_id = u.id
                WHERE o.seller_id = ?
            `;
            countQuery = 'SELECT COUNT(*) as total FROM orders WHERE seller_id = ?';
            params = [userId];
            countParams = [userId];

            if (status) {
                query += ' AND o.status = ?';
                countQuery += ' AND status = ?';
                params.push(status);
                countParams.push(status);
            }

            query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
            params.push(limitNum, offset);
        } else if (role === 'admin') {
            query = `
                SELECT o.*, s.name as service_name, c.name as category_name, 
                       u.username as client_username, u.email as client_email
                FROM orders o
                JOIN services s ON o.service_id = s.id
                JOIN categories c ON s.category_id = c.id
                JOIN users u ON o.user_id = u.id
                WHERE 1=1
            `;
            countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
            params = [];
            countParams = [];

            if (status) {
                query += ' AND o.status = ?';
                countQuery += ' AND status = ?';
                params.push(status);
                countParams.push(status);
            }

            query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
            params.push(limitNum, offset);
        }

        const [orders] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            orders: orders.map(order => ({
                ...order,
                price: parseFloat(order.price),
                quantity: parseInt(order.quantity),
                start_count: parseInt(order.start_count || 0),
                remains: parseInt(order.remains || 0)
            })),
            pagination: {
                page: parseInt(page),
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;
        const role = req.user.role;

        let query = `
            SELECT o.*, s.name as service_name, s.description as service_description,
                   c.name as category_name, u.username as client_username
            FROM orders o
            JOIN services s ON o.service_id = s.id
            JOIN categories c ON s.category_id = c.id
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `;
        let params = [orderId];

        if (role === 'client') {
            query += ' AND o.user_id = ?';
            params.push(userId);
        } else if (role === 'seller') {
            query += ' AND o.seller_id = ?';
            params.push(userId);
        }

        const [orders] = await pool.execute(query, params);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            order: {
                ...orders[0],
                price: parseFloat(orders[0].price),
                quantity: parseInt(orders[0].quantity),
                start_count: parseInt(orders[0].start_count || 0),
                remains: parseInt(orders[0].remains || 0)
            }
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
});

// Update order status (Seller/Admin)
router.patch('/:id/status', authenticate, authorize('seller', 'admin'), sanitizeInput, async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        const validStatuses = ['pending', 'processing', 'in_progress', 'completed', 'partial', 'canceled', 'refunded'];
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

        // Check permissions
        if (role === 'seller' && order.seller_id !== userId && order.seller_id !== null) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this order'
            });
        }

        // If seller is accepting order
        if (role === 'seller' && order.seller_id === null && status === 'processing') {
            await pool.execute(
                'UPDATE orders SET seller_id = ?, status = ? WHERE id = ?',
                [userId, 'processing', orderId]
            );
        } else {
            await pool.execute(
                'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, orderId]
            );
        }

        // If completed, update completed_at
        if (status === 'completed') {
            await pool.execute(
                'UPDATE orders SET completed_at = NOW() WHERE id = ?',
                [orderId]
            );
        }

        // If canceled/refunded, refund user
        if ((status === 'canceled' || status === 'refunded') && order.status !== 'canceled' && order.status !== 'refunded') {
            const [users] = await pool.execute(
                'SELECT balance FROM users WHERE id = ?',
                [order.user_id]
            );

            const newBalance = parseFloat(users[0].balance) + parseFloat(order.price);
            await pool.execute(
                'UPDATE users SET balance = ? WHERE id = ?',
                [newBalance, order.user_id]
            );

            await pool.execute(
                'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, order_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [order.user_id, 'refund', parseFloat(order.price), parseFloat(users[0].balance), newBalance, orderId, `Refund for order #${orderId}`]
            );
        }

        logAction(userId, 'order_status_updated', { order_id: orderId, status });

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
});

module.exports = router;

