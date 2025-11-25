const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { hashPassword, comparePassword, generateToken, logLogin, getClientIP } = require('../utils/helpers');
const { validateRegister, validateLogin, sanitizeInput } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { DEMO_MODE, mockDB } = require('../config/demo-mode');

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later.'
});

// Register
router.post('/register', authLimiter, sanitizeInput, validateRegister, async (req, res) => {
    try {
        const { username, email, password, referral_code } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required'
            });
        }

        // Demo Mode
        if (DEMO_MODE) {
            // Check if user exists
            const existingUser = mockDB.findUserByEmail(email) || 
                                mockDB.users.find(u => u.username === username);
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username or email already exists'
                });
            }

            // Hash password
            const hashedPassword = await hashPassword(password);

            // Create user
            const result = mockDB.createUser({
                username,
                email,
                password: hashedPassword,
                role: 'client'
            });

            const userId = result.insertId;
            const token = generateToken(userId);

            return res.status(201).json({
                success: true,
                message: 'Registration successful (Demo Mode)',
                token,
                user: {
                    id: userId,
                    username,
                    email,
                    role: 'client',
                    balance: 0.00
                }
            });
        }

        // Real Mode
        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, role, balance) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, 'client', 0.00]
        );

        const userId = result.insertId;

        // Handle referral code if provided
        if (referral_code) {
            const [affiliates] = await pool.execute(
                'SELECT id, user_id FROM affiliates WHERE referral_code = ? AND status = ?',
                [referral_code, 'active']
            );

            if (affiliates.length > 0) {
                await pool.execute(
                    'INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, status) VALUES (?, ?, ?)',
                    [affiliates[0].id, userId, 'pending']
                );
            }
        }

        // Generate token
        const token = generateToken(userId);

        // Log registration
        logLogin(userId, email, getClientIP(req), req.headers['user-agent'], 'success');

        // Ensure response is sent as JSON
        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: userId,
                username,
                email,
                role: 'client',
                balance: 0.00
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Check if it's a database connection error
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Database connection failed. Please make sure MySQL is running and check your database configuration in .env file.'
            });
        }
        
        // Check if database doesn't exist
        if (error.code === 'ER_BAD_DB_ERROR') {
            return res.status(503).json({
                success: false,
                message: 'Database does not exist. Please create the database: CREATE DATABASE smm_webpanel;'
            });
        }
        
        // Check if table doesn't exist
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Database tables not found. Please import database.sql file.'
            });
        }
        
        // Check if it's a validation error
        if (error.errors && Array.isArray(error.errors)) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        
        // Generic error
        res.status(500).json({
            success: false,
            message: error.message || 'Registration failed. Please try again.'
        });
    }
});

// Login
router.post('/login', authLimiter, sanitizeInput, validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Demo Mode
        if (DEMO_MODE) {
            const user = mockDB.findUserByEmail(email);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check if user is banned
            if (user.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Account is suspended or banned'
                });
            }

            // Verify password (in demo mode, accept any password or check against hash)
            const isPasswordValid = await comparePassword(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate token
            const token = generateToken(user.id);

            return res.json({
                success: true,
                message: 'Login successful (Demo Mode)',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    balance: parseFloat(user.balance)
                }
            });
        }

        // Real Mode
        // Find user
        const [users] = await pool.execute(
            'SELECT id, username, email, password, role, status, balance FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            logLogin(null, email, getClientIP(req), req.headers['user-agent'], 'failed');
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check if user is banned
        if (user.status !== 'active') {
            logLogin(user.id, email, getClientIP(req), req.headers['user-agent'], 'failed');
            return res.status(403).json({
                success: false,
                message: 'Account is suspended or banned'
            });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            logLogin(user.id, email, getClientIP(req), req.headers['user-agent'], 'failed');
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        await pool.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Generate token
        const token = generateToken(user.id);

        // Log successful login
        logLogin(user.id, email, getClientIP(req), req.headers['user-agent'], 'success');

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                balance: parseFloat(user.balance)
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
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
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user data'
        });
    }
});

// Password Reset Request
router.post('/forgot-password', authLimiter, sanitizeInput, async (req, res) => {
    try {
        const { email } = req.body;

        const [users] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        // Don't reveal if email exists for security
        if (users.length === 0) {
            return res.json({
                success: true,
                message: 'If the email exists, a password reset link has been sent.'
            });
        }

        const userId = users[0].id;
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        // Delete old tokens
        await pool.execute(
            'DELETE FROM password_reset_tokens WHERE user_id = ?',
            [userId]
        );

        // Create new token
        await pool.execute(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, token, expiresAt]
        );

        // TODO: Send email with reset link
        // For now, just return success (in production, send email)

        res.json({
            success: true,
            message: 'If the email exists, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request'
        });
    }
});

// Reset Password
router.post('/reset-password', authLimiter, sanitizeInput, async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token or password'
            });
        }

        // Find valid token
        const [tokens] = await pool.execute(
            'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() AND used = FALSE',
            [token]
        );

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        const userId = tokens[0].user_id;
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        // Mark token as used
        await pool.execute(
            'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
            [token]
        );

        res.json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
});

module.exports = router;

