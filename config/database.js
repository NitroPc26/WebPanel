const mysql = require('mysql2/promise');
require('dotenv').config();
const { DEMO_MODE } = require('./demo-mode');

let pool;

if (!DEMO_MODE) {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'smm_webpanel',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });

    // Test connection
    pool.getConnection()
        .then(connection => {
            console.log('✅ Database connected successfully');
            connection.release();
        })
        .catch(err => {
            console.error('❌ Database connection error:', err.message);
            if (err.code === 'ECONNREFUSED') {
                console.error('⚠️  MySQL is not running or connection refused');
                console.error('   Please make sure MySQL is running and check your .env configuration');
            } else if (err.code === 'ER_BAD_DB_ERROR') {
                console.error('⚠️  Database does not exist');
                console.error('   Please create the database: CREATE DATABASE smm_webpanel;');
            } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
                console.error('⚠️  Access denied - check DB_USER and DB_PASSWORD in .env');
            }
        });
} else {
    // Demo mode - create a mock pool object
    console.log('🎭 DEMO MODE ENABLED - Using mock data (no database required)');
    pool = {
        execute: async () => {
            throw new Error('Database not available in demo mode');
        },
        getConnection: async () => {
            throw new Error('Database not available in demo mode');
        }
    };
}

module.exports = pool;

