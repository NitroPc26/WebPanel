const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { paginate } = require('../utils/helpers');
const { DEMO_MODE, mockDB } = require('../config/demo-mode');

// Get user transactions
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { page = 1, limit = 50, type } = req.query;
        const { offset, limit: limitNum } = paginate(page, limit);

        // Demo Mode
        if (DEMO_MODE) {
            let transactions = mockDB.transactions.filter(t => t.user_id === userId);
            if (type) {
                transactions = transactions.filter(t => t.type === type);
            }
            transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            const total = transactions.length;
            transactions = transactions.slice(offset, offset + limitNum);

            return res.json({
                success: true,
                transactions: transactions.map(t => ({
                    ...t,
                    amount: parseFloat(t.amount),
                    balance_before: parseFloat(t.balance_before),
                    balance_after: parseFloat(t.balance_after)
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
        let query = 'SELECT * FROM transactions WHERE user_id = ?';
        let params = [userId];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const [transactions] = await pool.execute(query, params);

        const [countResult] = await pool.execute(
            type 
                ? 'SELECT COUNT(*) as total FROM transactions WHERE user_id = ? AND type = ?'
                : 'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
            type ? [userId, type] : [userId]
        );

        res.json({
            success: true,
            transactions: transactions.map(t => ({
                ...t,
                amount: parseFloat(t.amount),
                balance_before: parseFloat(t.balance_before),
                balance_after: parseFloat(t.balance_after)
            })),
            pagination: {
                page: parseInt(page),
                limit: limitNum,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions'
        });
    }
});

// Add funds (Client - manual or via API)
router.post('/deposit', authenticate, authorize('client'), sanitizeInput, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, payment_method } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        // Get settings for min/max deposit
        const [settings] = await pool.execute(
            'SELECT setting_value FROM settings WHERE setting_key IN (?, ?)',
            ['min_deposit', 'max_deposit']
        );

        const minDeposit = parseFloat(settings.find(s => s.setting_key === 'min_deposit')?.setting_value || 5);
        const maxDeposit = parseFloat(settings.find(s => s.setting_key === 'max_deposit')?.setting_value || 10000);

        if (amount < minDeposit || amount > maxDeposit) {
            return res.status(400).json({
                success: false,
                message: `Amount must be between ${minDeposit} and ${maxDeposit}`
            });
        }

        // Get current balance
        const [users] = await pool.execute(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );

        const balanceBefore = parseFloat(users[0].balance);
        const balanceAfter = balanceBefore + parseFloat(amount);

        // Update balance
        await pool.execute(
            'UPDATE users SET balance = ? WHERE id = ?',
            [balanceAfter, userId]
        );

        // Create transaction
        await pool.execute(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'deposit', parseFloat(amount), balanceBefore, balanceAfter, `Deposit via ${payment_method || 'manual'}`, userId]
        );

        res.json({
            success: true,
            message: 'Funds added successfully',
            balance: balanceAfter
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add funds'
        });
    }
});

// Admin: Add/Remove funds from user
router.post('/admin/adjust', authenticate, authorize('admin'), sanitizeInput, async (req, res) => {
    try {
        const { user_id, amount, type, description } = req.body;
        const adminId = req.user.id;

        if (!user_id || !amount || !type) {
            return res.status(400).json({
                success: false,
                message: 'User ID, amount, and type are required'
            });
        }

        if (!['admin_add', 'admin_remove'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid transaction type'
            });
        }

        // Get user balance
        const [users] = await pool.execute(
            'SELECT balance FROM users WHERE id = ?',
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const balanceBefore = parseFloat(users[0].balance);
        let balanceAfter;
        let transactionAmount;

        if (type === 'admin_add') {
            balanceAfter = balanceBefore + parseFloat(amount);
            transactionAmount = parseFloat(amount);
        } else {
            balanceAfter = balanceBefore - parseFloat(amount);
            transactionAmount = -parseFloat(amount);
        }

        // Update balance
        await pool.execute(
            'UPDATE users SET balance = ? WHERE id = ?',
            [balanceAfter, user_id]
        );

        // Create transaction
        await pool.execute(
            'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, type, transactionAmount, balanceBefore, balanceAfter, description || `Admin adjustment by user #${adminId}`, adminId]
        );

        res.json({
            success: true,
            message: 'Balance adjusted successfully',
            new_balance: balanceAfter
        });
    } catch (error) {
        console.error('Admin adjust balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to adjust balance'
        });
    }
});

module.exports = router;

