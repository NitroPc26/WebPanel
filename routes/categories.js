const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { DEMO_MODE, mockDB } = require('../config/demo-mode');

// Get all categories
router.get('/', optionalAuth, async (req, res) => {
    try {
        // Demo Mode
        if (DEMO_MODE) {
            return res.json({
                success: true,
                categories: mockDB.getCategories()
            });
        }

        // Real Mode
        const [categories] = await pool.execute(
            'SELECT * FROM categories WHERE status = ? ORDER BY name',
            ['active']
        );

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
});

// Get single category
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const categoryId = req.params.id;

        const [categories] = await pool.execute(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            category: categories[0]
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
});

// Create category (Seller/Admin)
router.post('/', authenticate, authorize('seller', 'admin'), sanitizeInput, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const [result] = await pool.execute(
            'INSERT INTO categories (name, description, status) VALUES (?, ?, ?)',
            [name, description || null, 'active']
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: {
                id: result.insertId,
                name,
                description,
                status: 'active'
            }
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
});

// Update category (Seller/Admin)
router.put('/:id', authenticate, authorize('seller', 'admin'), sanitizeInput, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, description, status } = req.body;

        const [categories] = await pool.execute(
            'SELECT id FROM categories WHERE id = ?',
            [categoryId]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await pool.execute(
            'UPDATE categories SET name = ?, description = ?, status = ?, updated_at = NOW() WHERE id = ?',
            [name, description || null, status || 'active', categoryId]
        );

        res.json({
            success: true,
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
});

// Delete category (Seller/Admin)
router.delete('/:id', authenticate, authorize('seller', 'admin'), async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Check if category has services
        const [services] = await pool.execute(
            'SELECT COUNT(*) as count FROM services WHERE category_id = ?',
            [categoryId]
        );

        if (services[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with existing services'
            });
        }

        await pool.execute(
            'DELETE FROM categories WHERE id = ?',
            [categoryId]
        );

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
});

module.exports = router;

