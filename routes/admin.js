const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { paginate } = require('../utils/helpers');
const { DEMO_MODE, mockDB } = require('../config/demo-mode');

// Get all settings
router.get('/settings', authenticate, authorize('admin'), async (req, res) => {
    try {
        // Demo Mode
        if (DEMO_MODE) {
            const settingsObj = {
                site_name: 'SMM WebPanel',
                site_logo: '',
                maintenance_mode: false,
                global_margin: 0,
                currency: 'USD',
                min_deposit: 5.00,
                max_deposit: 10000.00,
                smtp_enabled: false,
                smtp_host: '',
                smtp_port: 587,
                smtp_user: '',
                smtp_pass: '',
                smtp_from: ''
            };

            return res.json({
                success: true,
                settings: settingsObj
            });
        }

        // Real Mode
        const [settings] = await pool.execute(
            'SELECT setting_key, setting_value, setting_type FROM settings'
        );

        const settingsObj = {};
        settings.forEach(setting => {
            if (setting.setting_type === 'number') {
                settingsObj[setting.setting_key] = parseFloat(setting.setting_value);
            } else if (setting.setting_type === 'boolean') {
                settingsObj[setting.setting_key] = setting.setting_value === '1';
            } else {
                settingsObj[setting.setting_key] = setting.setting_value;
            }
        });

        res.json({
            success: true,
            settings: settingsObj
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings'
        });
    }
});

// Update settings
router.put('/settings', authenticate, authorize('admin'), sanitizeInput, async (req, res) => {
    try {
        const settings = req.body;

        for (const [key, value] of Object.entries(settings)) {
            const settingType = typeof value === 'boolean' ? 'boolean' : 
                               typeof value === 'number' ? 'number' : 'string';
            const settingValue = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);

            await pool.execute(
                'INSERT INTO settings (setting_key, setting_value, setting_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, setting_type = ?',
                [key, settingValue, settingType, settingValue, settingType]
            );
        }

        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings'
        });
    }
});

// Get login logs
router.get('/logs/login', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 50, status, user_id } = req.query;
        const { offset, limit: limitNum } = paginate(page, limit);

        // Demo Mode
        if (DEMO_MODE) {
            const logs = [
                {
                    id: 1,
                    user_id: 1,
                    email: 'admin@webpanel.com',
                    ip_address: '127.0.0.1',
                    user_agent: 'Mozilla/5.0',
                    status: 'success',
                    created_at: new Date().toISOString(),
                    username: 'admin'
                },
                {
                    id: 2,
                    user_id: 3,
                    email: 'client@webpanel.com',
                    ip_address: '127.0.0.1',
                    user_agent: 'Mozilla/5.0',
                    status: 'success',
                    created_at: new Date().toISOString(),
                    username: 'client1'
                }
            ];

            return res.json({
                success: true,
                logs: logs.slice(offset, offset + limitNum),
                pagination: {
                    page: parseInt(page),
                    limit: limitNum,
                    total: logs.length,
                    pages: Math.ceil(logs.length / limitNum)
                }
            });
        }

        // Real Mode
        let query = `
            SELECT ll.*, u.username, u.email
            FROM login_logs ll
            LEFT JOIN users u ON ll.user_id = u.id
            WHERE 1=1
        `;
        let params = [];

        if (status) {
            query += ' AND ll.status = ?';
            params.push(status);
        }

        if (user_id) {
            query += ' AND ll.user_id = ?';
            params.push(user_id);
        }

        query += ' ORDER BY ll.created_at DESC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const [logs] = await pool.execute(query, params);

        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM login_logs WHERE 1=1' +
            (status ? ' AND status = ?' : '') +
            (user_id ? ' AND user_id = ?' : ''),
            params.slice(0, -2)
        );

        res.json({
            success: true,
            logs,
            pagination: {
                page: parseInt(page),
                limit: limitNum,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get login logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch login logs'
        });
    }
});

// Get API logs
router.get('/logs/api', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 50, user_id } = req.query;
        const { offset, limit: limitNum } = paginate(page, limit);

        let query = `
            SELECT al.*, u.username, u.email
            FROM api_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        let params = [];

        if (user_id) {
            query += ' AND al.user_id = ?';
            params.push(user_id);
        }

        query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const [logs] = await pool.execute(query, params);

        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM api_logs WHERE 1=1' +
            (user_id ? ' AND user_id = ?' : ''),
            params.slice(0, -2)
        );

        res.json({
            success: true,
            logs,
            pagination: {
                page: parseInt(page),
                limit: limitNum,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get API logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch API logs'
        });
    }
});

// Get order logs (all orders with details)
router.get('/logs/orders', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 50, status } = req.query;
        const { offset, limit: limitNum } = paginate(page, limit);

        // Demo Mode
        if (DEMO_MODE) {
            let orders = mockDB.orders.map(order => {
                const user = mockDB.findUserById(order.user_id);
                return {
                    ...order,
                    service_name: order.service_name,
                    client_username: user?.username || 'Unknown',
                    client_email: user?.email || 'unknown@example.com'
                };
            });

            if (status) {
                orders = orders.filter(o => o.status === status);
            }

            const total = orders.length;
            orders = orders.slice(offset, offset + limitNum);

            return res.json({
                success: true,
                orders: orders.map(order => ({
                    ...order,
                    price: parseFloat(order.price),
                    quantity: parseInt(order.quantity)
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
        let query = `
            SELECT o.*, s.name as service_name, u.username as client_username, u.email as client_email
            FROM orders o
            JOIN services s ON o.service_id = s.id
            JOIN users u ON o.user_id = u.id
            WHERE 1=1
        `;
        let params = [];

        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const [orders] = await pool.execute(query, params);

        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM orders WHERE 1=1' +
            (status ? ' AND status = ?' : ''),
            params.slice(0, -2)
        );

        res.json({
            success: true,
            orders: orders.map(order => ({
                ...order,
                price: parseFloat(order.price),
                quantity: parseInt(order.quantity)
            })),
            pagination: {
                page: parseInt(page),
                limit: limitNum,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get order logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order logs'
        });
    }
});

// Export orders as CSV
router.get('/export/orders', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { status, start_date, end_date } = req.query;

        let query = `
            SELECT o.id, o.created_at, o.status, o.link, o.quantity, o.price,
                   s.name as service_name, u.username as client_username, u.email as client_email
            FROM orders o
            JOIN services s ON o.service_id = s.id
            JOIN users u ON o.user_id = u.id
            WHERE 1=1
        `;
        let params = [];

        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        if (start_date) {
            query += ' AND o.created_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND o.created_at <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY o.created_at DESC';

        const [orders] = await pool.execute(query, params);

        // Generate CSV
        const csvHeader = 'ID,Date,Status,Service,Client,Email,Link,Quantity,Price\n';
        const csvRows = orders.map(order => {
            return [
                order.id,
                order.created_at,
                order.status,
                `"${order.service_name}"`,
                order.client_username,
                order.client_email,
                order.link,
                order.quantity,
                parseFloat(order.price).toFixed(4)
            ].join(',');
        });

        const csv = csvHeader + csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export orders'
        });
    }
});

module.exports = router;

