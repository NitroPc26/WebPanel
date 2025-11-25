const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validateService, sanitizeInput } = require('../middleware/validation');
const { paginate } = require('../utils/helpers');
const { DEMO_MODE, mockDB } = require('../config/demo-mode');

// Get all services (public, but shows different prices based on role)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { category_id, search, page = 1, limit = 50 } = req.query;
        const { offset, limit: limitNum } = paginate(page, limit);
        const userRole = req.user?.role || 'client';

        // Demo Mode
        if (DEMO_MODE) {
            let services = mockDB.getServices({ category_id, search });
            
            // Apply pagination
            const start = offset;
            const end = start + limitNum;
            services = services.slice(start, end);

            const servicesWithPrice = services.map(service => ({
                id: service.id,
                category_id: service.category_id,
                category_name: service.category_name,
                name: service.name,
                description: service.description,
                price: userRole === 'seller' ? parseFloat(service.reseller_price) : parseFloat(service.price),
                min_quantity: parseInt(service.min_quantity),
                max_quantity: parseInt(service.max_quantity),
                speed: service.speed,
                api_service_id: service.api_service_id
            }));

            return res.json({
                success: true,
                services: servicesWithPrice
            });
        }

        // Real Mode
        let query = `
            SELECT s.*, c.name as category_name, c.description as category_description
            FROM services s
            JOIN categories c ON s.category_id = c.id
            WHERE s.status = 'active' AND c.status = 'active'
        `;
        let params = [];

        if (category_id) {
            query += ' AND s.category_id = ?';
            params.push(category_id);
        }

        if (search) {
            query += ' AND (s.name LIKE ? OR s.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY c.name, s.name LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const [services] = await pool.execute(query, params);

        // Adjust price based on user role
        const servicesWithPrice = services.map(service => ({
            id: service.id,
            category_id: service.category_id,
            category_name: service.category_name,
            name: service.name,
            description: service.description,
            price: userRole === 'seller' ? parseFloat(service.reseller_price) : parseFloat(service.price),
            min_quantity: parseInt(service.min_quantity),
            max_quantity: parseInt(service.max_quantity),
            speed: service.speed,
            api_service_id: service.api_service_id
        }));

        res.json({
            success: true,
            services: servicesWithPrice
        });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services'
        });
    }
});

// Get single service
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const userRole = req.user?.role || 'client';

        const [services] = await pool.execute(
            `SELECT s.*, c.name as category_name, c.description as category_description
             FROM services s
             JOIN categories c ON s.category_id = c.id
             WHERE s.id = ? AND s.status = 'active'`,
            [serviceId]
        );

        if (services.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        const service = services[0];
        res.json({
            success: true,
            service: {
                id: service.id,
                category_id: service.category_id,
                category_name: service.category_name,
                name: service.name,
                description: service.description,
                price: userRole === 'seller' ? parseFloat(service.reseller_price) : parseFloat(service.price),
                min_quantity: parseInt(service.min_quantity),
                max_quantity: parseInt(service.max_quantity),
                speed: service.speed,
                api_service_id: service.api_service_id
            }
        });
    } catch (error) {
        console.error('Get service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch service'
        });
    }
});

// Create service (Seller/Admin)
router.post('/', authenticate, authorize('seller', 'admin'), sanitizeInput, validateService, async (req, res) => {
    try {
        const { category_id, name, description, price, reseller_price, min_quantity, max_quantity, speed, api_service_id } = req.body;

        // Verify category exists
        const [categories] = await pool.execute(
            'SELECT id FROM categories WHERE id = ? AND status = ?',
            [category_id, 'active']
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const [result] = await pool.execute(
            'INSERT INTO services (category_id, name, description, price, reseller_price, min_quantity, max_quantity, speed, api_service_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [category_id, name, description, price, reseller_price || price, min_quantity, max_quantity, speed || 'fast', api_service_id || null]
        );

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            service: {
                id: result.insertId,
                category_id,
                name,
                description,
                price: parseFloat(price),
                reseller_price: parseFloat(reseller_price || price),
                min_quantity: parseInt(min_quantity),
                max_quantity: parseInt(max_quantity),
                speed: speed || 'fast'
            }
        });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create service'
        });
    }
});

// Update service (Seller/Admin)
router.put('/:id', authenticate, authorize('seller', 'admin'), sanitizeInput, validateService, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const { category_id, name, description, price, reseller_price, min_quantity, max_quantity, speed, status, api_service_id } = req.body;

        // Check if service exists
        const [services] = await pool.execute(
            'SELECT id FROM services WHERE id = ?',
            [serviceId]
        );

        if (services.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        await pool.execute(
            'UPDATE services SET category_id = ?, name = ?, description = ?, price = ?, reseller_price = ?, min_quantity = ?, max_quantity = ?, speed = ?, status = ?, api_service_id = ?, updated_at = NOW() WHERE id = ?',
            [category_id, name, description, price, reseller_price || price, min_quantity, max_quantity, speed || 'fast', status || 'active', api_service_id || null, serviceId]
        );

        res.json({
            success: true,
            message: 'Service updated successfully'
        });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update service'
        });
    }
});

// Delete service (Seller/Admin)
router.delete('/:id', authenticate, authorize('seller', 'admin'), async (req, res) => {
    try {
        const serviceId = req.params.id;

        // Check if service has orders
        const [orders] = await pool.execute(
            'SELECT COUNT(*) as count FROM orders WHERE service_id = ?',
            [serviceId]
        );

        if (orders[0].count > 0) {
            // Soft delete by setting status to inactive
            await pool.execute(
                'UPDATE services SET status = ? WHERE id = ?',
                ['inactive', serviceId]
            );
        } else {
            // Hard delete if no orders
            await pool.execute(
                'DELETE FROM services WHERE id = ?',
                [serviceId]
            );
        }

        res.json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete service'
        });
    }
});

module.exports = router;

