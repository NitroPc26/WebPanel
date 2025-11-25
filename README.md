# SMM Seller WebPanel

A complete, professional Social Media Marketing (SMM) seller webpanel built with Node.js, Express, MySQL, and modern frontend technologies.

## Features

### General
- ✅ Full authentication system (Register, Login, Password reset)
- ✅ User roles: Admin, Seller, Client
- ✅ Dashboard with statistics and quick actions
- ✅ Fast loading & clean UI with dark/light mode
- ✅ Notifications system
- ✅ API-ready structure

### Client Features
- ✅ Create new orders with auto price calculation
- ✅ Order status tracking
- ✅ Order history with filtering & search
- ✅ Balance system (Add funds)
- ✅ Tickets/Support center
- ✅ Service list browser
- ✅ Profile settings

### Seller Features
- ✅ Order management (Accept/Reject/Complete)
- ✅ Service management (Add/Edit/Delete)
- ✅ Category management
- ✅ Balance management

### Admin Features
- ✅ Control all users
- ✅ Add funds to any user
- ✅ Ban/Unban accounts
- ✅ WebPanel settings
- ✅ API system management
- ✅ Logs (Login, Payments, Orders)
- ✅ Export orders as CSV

### Security
- ✅ SQL Injection protection (parameterized queries)
- ✅ XSS protection (input sanitization)
- ✅ CSRF protection ready
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting on auth routes
- ✅ Admin protected routes

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Step 1: Clone/Download the Project
```bash
cd WebPanel
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Database Setup
1. Create a MySQL database:
```sql
CREATE DATABASE smm_webpanel;
```

2. Import the database schema:
```bash
mysql -u root -p smm_webpanel < database.sql
```

Or use MySQL Workbench/phpMyAdmin to import `database.sql`

### Step 4: Environment Configuration
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smm_webpanel
DB_PORT=3306

# JWT Secret (Generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Session Secret (Generate a strong random string)
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Website Configuration
SITE_NAME=SMM WebPanel
SITE_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important:** Change the default admin password after first login!
- Default admin credentials:
  - Email: `admin@webpanel.com`
  - Password: `admin123`

### Step 5: Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## Project Structure

```
WebPanel/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── validation.js        # Input validation
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── dashboard.js         # Dashboard routes
│   ├── orders.js            # Order management routes
│   ├── services.js          # Service management routes
│   ├── categories.js        # Category routes
│   ├── transactions.js      # Transaction routes
│   ├── tickets.js           # Support ticket routes
│   ├── users.js             # User management routes
│   ├── admin.js             # Admin routes
│   └── api.js               # External API routes
├── utils/
│   └── helpers.js           # Utility functions
├── public/
│   ├── css/
│   │   └── style.css        # Custom styles
│   ├── js/
│   │   ├── auth.js          # Authentication utilities
│   │   └── utils.js         # Frontend utilities
│   ├── index.html           # Homepage
│   ├── login.html           # Login page
│   ├── register.html        # Registration page
│   ├── dashboard.html       # Client dashboard
│   ├── orders.html          # Orders page
│   ├── services.html        # Services page
│   ├── balance.html         # Balance page
│   ├── tickets.html         # Support tickets
│   ├── profile.html         # Profile settings
│   ├── seller-orders.html   # Seller orders
│   ├── seller-services.html # Seller services
│   ├── admin-dashboard.html # Admin dashboard
│   └── 404.html             # 404 page
├── database.sql             # Database schema
├── server.js                # Main server file
├── package.json             # Dependencies
└── README.md                # This file
```

## API Documentation

### Authentication

#### Register
```
POST /api/auth/register
Body: {
  "username": "string",
  "email": "string",
  "password": "string",
  "referral_code": "string (optional)"
}
```

#### Login
```
POST /api/auth/login
Body: {
  "email": "string",
  "password": "string"
}
```

#### Get Current User
```
GET /api/auth/me
Headers: Authorization: Bearer {token}
```

### Orders

#### Create Order
```
POST /api/orders
Headers: Authorization: Bearer {token}
Body: {
  "service_id": "integer",
  "link": "string (URL)",
  "quantity": "integer",
  "coupon_code": "string (optional)"
}
```

#### Get Orders
```
GET /api/orders?page=1&limit=20&status=pending&search=query
Headers: Authorization: Bearer {token}
```

#### Update Order Status (Seller/Admin)
```
PATCH /api/orders/:id/status
Headers: Authorization: Bearer {token}
Body: {
  "status": "pending|processing|in_progress|completed|partial|canceled|refunded"
}
```

### Services

#### Get Services
```
GET /api/services?category_id=1&search=query&page=1&limit=50
```

#### Create Service (Seller/Admin)
```
POST /api/services
Headers: Authorization: Bearer {token}
Body: {
  "category_id": "integer",
  "name": "string",
  "description": "string",
  "price": "float",
  "reseller_price": "float",
  "min_quantity": "integer",
  "max_quantity": "integer",
  "speed": "fast|very_fast",
  "api_service_id": "string (optional)"
}
```

### External API

#### Create Order via API
```
POST /api/external/order
Headers: X-API-Key: {api_key}
Body: {
  "service_id": "integer",
  "link": "string",
  "quantity": "integer",
  "user_id": "integer (optional)"
}
```

#### Update Order Status via API
```
POST /api/external/order/:id/status
Headers: X-API-Key: {api_key}
Body: {
  "status": "string",
  "start_count": "integer (optional)",
  "remains": "integer (optional)"
}
```

#### Sync Services via API
```
POST /api/external/services/sync
Headers: X-API-Key: {api_key}
Body: {
  "services": [
    {
      "api_service_id": "string",
      "category_id": "integer",
      "name": "string",
      "description": "string",
      "price": "float",
      "reseller_price": "float",
      "min_quantity": "integer",
      "max_quantity": "integer",
      "speed": "string"
    }
  ]
}
```

## Security Notes

1. **Change Default Passwords**: Always change the default admin password after installation
2. **JWT Secret**: Use a strong, random JWT secret in production
3. **Database**: Use strong database passwords
4. **HTTPS**: Use HTTPS in production
5. **Rate Limiting**: Adjust rate limits based on your needs
6. **Environment Variables**: Never commit `.env` file to version control

## Customization

### Themes
The panel supports dark/light mode. Users can toggle it using the theme button.

### Adding Payment Gateways
To add payment gateways, modify the deposit endpoint in `routes/transactions.js` and integrate with your preferred payment provider.

### Email Configuration
Configure SMTP settings in `.env` to enable email notifications for password resets and other features.

## Troubleshooting

### Database Connection Error
- Check MySQL is running
- Verify database credentials in `.env`
- Ensure database exists

### Port Already in Use
- Change `PORT` in `.env` file
- Or stop the process using port 3000

### Module Not Found
- Run `npm install` again
- Check Node.js version (should be v14+)

## Support

For issues and questions, please create a support ticket in the panel or contact the development team.

## License

This project is provided as-is for commercial use.

## Credits

Built with:
- Node.js & Express
- MySQL
- TailwindCSS
- Font Awesome Icons

---

**Note**: This is a complete production-ready webpanel. Make sure to:
1. Change all default passwords
2. Configure proper SMTP settings
3. Set up SSL/HTTPS for production
4. Regular database backups
5. Monitor logs for security issues

