require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { DEMO_MODE } = require('./config/demo-mode');

const app = express();

// Log Demo Mode status
if (DEMO_MODE) {
    console.log('🎭 DEMO MODE ENABLED - Using mock data (no database required)');
} else {
    console.log('💾 REAL MODE - Database connection required');
}

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for TailwindCSS
    crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const serviceRoutes = require('./routes/services');
const categoryRoutes = require('./routes/categories');
const transactionRoutes = require('./routes/transactions');
const ticketRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/external', apiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve Frontend Pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'services.html'));
});

app.get('/balance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'balance.html'));
});

app.get('/tickets', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tickets.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Seller Routes
app.get('/seller/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'seller-orders.html'));
});

app.get('/seller/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'seller-services.html'));
});

// Admin Routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/admin/users', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-users.html'));
});

app.get('/admin/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-settings.html'));
});

app.get('/admin/logs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-logs.html'));
});

// 404 Handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    
    // Ensure we always send JSON
    if (!res.headersSent) {
        res.status(err.status || 500).json({ 
            success: false, 
            message: err.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Export for Vercel
module.exports = app;

// Only listen if not in Vercel environment
if (process.env.VERCEL !== '1' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

