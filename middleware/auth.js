const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Verify JWT Token
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user still exists and is active
        const [users] = await pool.execute(
            'SELECT id, username, email, role, status FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!users.length || users[0].status !== 'active') {
            return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

// Check user role
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        // Flatten roles array in case nested arrays are passed
        const roles = allowedRoles.flat();
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }

        next();
    };
};

// Optional authentication (for public routes that can show user-specific data if logged in)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [users] = await pool.execute(
                'SELECT id, username, email, role, status FROM users WHERE id = ? AND status = ?',
                [decoded.userId, 'active']
            );

            if (users.length) {
                req.user = users[0];
            }
        }
        
        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth
};

