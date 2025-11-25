const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

// Hash password
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Generate random string
const generateRandomString = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Calculate order price
const calculateOrderPrice = (servicePrice, quantity) => {
    return parseFloat((servicePrice * quantity).toFixed(4));
};

// Log user action
const logAction = async (userId, action, details = {}) => {
    try {
        await pool.execute(
            'INSERT INTO api_logs (user_id, endpoint, method, request_data, status_code) VALUES (?, ?, ?, ?, ?)',
            [userId, action, 'POST', JSON.stringify(details), 200]
        );
    } catch (error) {
        console.error('Error logging action:', error);
    }
};

// Log login attempt
const logLogin = async (userId, email, ipAddress, userAgent, status) => {
    try {
        await pool.execute(
            'INSERT INTO login_logs (user_id, email, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?)',
            [userId, email, ipAddress, userAgent, status]
        );
    } catch (error) {
        console.error('Error logging login:', error);
    }
};

// Get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           'unknown';
};

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

// Validate URL
const isValidURL = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// Pagination helper
const paginate = (page, limit) => {
    const offset = (page - 1) * limit;
    return { offset, limit: parseInt(limit) };
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    generateRandomString,
    calculateOrderPrice,
    logAction,
    logLogin,
    getClientIP,
    formatCurrency,
    isValidURL,
    paginate
};

