const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { hashPassword } = require('../utils/helpers');
const { paginate } = require('../utils/helpers');
const { DEMO_MODE, mockDB } = require('../config/demo-mode');

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        // Demo Mode
        if (DEMO_MODE) {
            const user = mockDB.findUserById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    balance: parseFloat(user.balance || 0),
                    status: user.status,
                    created_at: user.created_at || new Date().toISOString(),
                    last_login: user.last_login || null
                }
            });
        }

        // Real Mode
        const [users] = await pool.execute(
            'SELECT id, username, email, role, balance, status, created_at, last_login FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                ...users[0],
                balance: parseFloat(users[0].balance)
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// Update profile
router.put('/profile', authenticate, sanitizeInput, async (req, res) => {
    try {
        const { username, email } = req.body;
        const userId = req.user.id;

        // Check if username/email already exists
        if (username || email) {
            const [existing] = await pool.execute(
                'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
                [username || '', email || '', userId]
            );

            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Username or email already exists'
                });
            }
        }

        const updates = [];
        const params = [];

        if (username) {
            updates.push('username = ?');
            params.push(username);
        }

        if (email) {
            updates.push('email = ?');
            params.push(email);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        params.push(userId);

        await pool.execute(
            `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            params
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Change password
router.put('/password', authenticate, sanitizeInput, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        // Get current password
        const [users] = await pool.execute(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );

        const { comparePassword } = require('../utils/helpers');
        const isPasswordValid = await comparePassword(current_password, users[0].password);

        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        const hashedPassword = await hashPassword(new_password);
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// Get all users (Admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 50, role, status, search } = req.query;
        const { offset, limit: limitNum } = paginate(page, limit);

        let query = 'SELECT id, username, email, role, balance, status, created_at, last_login FROM users WHERE 1=1';
        let params = [];

        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (username LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const [users] = await pool.execute(query, params);

        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM users WHERE 1=1' + 
            (role ? ' AND role = ?' : '') + 
            (status ? ' AND status = ?' : '') +
            (search ? ' AND (username LIKE ? OR email LIKE ?)' : ''),
            params.slice(0, -2)
        );

        res.json({
            success: true,
            users: users.map(user => ({
                ...user,
                balance: parseFloat(user.balance)
            })),
            pagination: {
                page: parseInt(page),
                limit: limitNum,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// Ban/Unban user (Admin)
router.patch('/:id/status', authenticate, authorize('admin'), sanitizeInput, async (req, res) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;

        if (!['active', 'banned', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        if (userId == req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own status'
            });
        }

        await pool.execute(
            'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, userId]
        );

        res.json({
            success: true,
            message: 'User status updated successfully'
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status'
        });
    }
});

module.exports = router;

