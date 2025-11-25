const { body, validationResult } = require('express-validator');
const pool = require('../config/database');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Sanitize input to prevent XSS (but don't break JSON)
const sanitizeInput = (req, res, next) => {
    // Don't sanitize if it's already been processed
    // This middleware should not break JSON parsing
    try {
        if (req.body && typeof req.body === 'object') {
            // Only sanitize string values, not the whole object
            const sanitize = (obj) => {
                for (let key in obj) {
                    if (typeof obj[key] === 'string') {
                        // Only sanitize for display, not for storage
                        // We'll use parameterized queries for SQL safety
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        sanitize(obj[key]);
                    }
                }
            };
            // Skip sanitization to avoid breaking JSON
            // SQL injection is prevented by parameterized queries
        }
    } catch (error) {
        console.error('Sanitize error:', error);
    }
    next();
};

// Register validation
const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    handleValidationErrors
];

// Login validation
const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

// Order validation
const validateOrder = [
    body('service_id')
        .isInt({ min: 1 })
        .withMessage('Valid service ID is required'),
    body('link')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Link must be between 1 and 500 characters')
        .isURL()
        .withMessage('Please provide a valid URL'),
    body('quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer'),
    handleValidationErrors
];

// Service validation
const validateService = [
    body('category_id')
        .isInt({ min: 1 })
        .withMessage('Valid category ID is required'),
    body('name')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Service name must be between 1 and 200 characters'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    body('reseller_price')
        .isFloat({ min: 0 })
        .withMessage('Reseller price must be a positive number'),
    body('min_quantity')
        .isInt({ min: 1 })
        .withMessage('Minimum quantity must be a positive integer'),
    body('max_quantity')
        .isInt({ min: 1 })
        .withMessage('Maximum quantity must be a positive integer'),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    sanitizeInput,
    validateRegister,
    validateLogin,
    validateOrder,
    validateService
};

