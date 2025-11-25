# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer {token}
```

---

## Authentication Endpoints

### Register
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "referral_code": "REF123" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "client"
  }
}
```

### Login
**POST** `/auth/login`

Authenticate and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "client",
    "balance": 0.00
  }
}
```

### Get Current User
**GET** `/auth/me`

Get current authenticated user information.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "client",
    "balance": 100.50,
    "status": "active",
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_login": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Dashboard Endpoints

### Get Dashboard Statistics
**GET** `/dashboard/stats`

Get dashboard statistics based on user role.

**Headers:**
- `Authorization: Bearer {token}`

**Response (Client):**
```json
{
  "success": true,
  "stats": {
    "total_orders": 50,
    "pending_orders": 5,
    "completed_orders": 40,
    "failed_orders": 5,
    "total_spent": 500.00,
    "balance": 100.50
  }
}
```

**Response (Admin):**
```json
{
  "success": true,
  "stats": {
    "total_orders": 1000,
    "pending_orders": 50,
    "completed_orders": 900,
    "failed_orders": 50,
    "total_users": 200,
    "clients": 180,
    "sellers": 20,
    "total_revenue": 10000.00
  }
}
```

### Get Recent Orders
**GET** `/dashboard/recent-orders?limit=10`

Get recent orders for dashboard.

**Headers:**
- `Authorization: Bearer {token}`

**Query Parameters:**
- `limit` (optional): Number of orders to return (default: 10)

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "service_name": "Instagram Followers",
      "link": "https://instagram.com/user",
      "quantity": 1000,
      "price": 10.00,
      "status": "completed",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## Order Endpoints

### Create Order
**POST** `/orders`

Create a new order.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "service_id": 1,
  "link": "https://instagram.com/username",
  "quantity": 1000,
  "coupon_code": "DISCOUNT10" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "id": 123,
    "service_id": 1,
    "link": "https://instagram.com/username",
    "quantity": 1000,
    "price": 10.00,
    "status": "pending"
  }
}
```

### Get Orders
**GET** `/orders?page=1&limit=20&status=pending&search=query`

Get user orders with pagination and filters.

**Headers:**
- `Authorization: Bearer {token}`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status
- `search` (optional): Search query

**Response:**
```json
{
  "success": true,
  "orders": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Get Single Order
**GET** `/orders/:id`

Get order details.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "order": {
    "id": 123,
    "service_name": "Instagram Followers",
    "link": "https://instagram.com/username",
    "quantity": 1000,
    "price": 10.00,
    "status": "completed",
    "start_count": 5000,
    "remains": 0,
    "created_at": "2024-01-15T10:00:00.000Z"
  }
}
```

### Update Order Status
**PATCH** `/orders/:id/status`

Update order status (Seller/Admin only).

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "status": "completed"
}
```

**Valid Statuses:**
- `pending`
- `processing`
- `in_progress`
- `completed`
- `partial`
- `canceled`
- `refunded`

---

## Service Endpoints

### Get Services
**GET** `/services?category_id=1&search=query&page=1&limit=50`

Get available services.

**Query Parameters:**
- `category_id` (optional): Filter by category
- `search` (optional): Search query
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "services": [
    {
      "id": 1,
      "category_id": 1,
      "category_name": "Instagram",
      "name": "Instagram Followers",
      "description": "High quality followers",
      "price": 0.01,
      "min_quantity": 100,
      "max_quantity": 10000,
      "speed": "fast"
    }
  ]
}
```

### Create Service
**POST** `/services`

Create a new service (Seller/Admin only).

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "category_id": 1,
  "name": "Instagram Followers",
  "description": "High quality followers",
  "price": 0.01,
  "reseller_price": 0.008,
  "min_quantity": 100,
  "max_quantity": 10000,
  "speed": "fast",
  "api_service_id": "IG_FOLLOWERS_001"
}
```

### Update Service
**PUT** `/services/:id`

Update a service (Seller/Admin only).

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:** Same as create service

### Delete Service
**DELETE** `/services/:id`

Delete a service (Seller/Admin only).

**Headers:**
- `Authorization: Bearer {token}`

---

## Category Endpoints

### Get Categories
**GET** `/categories`

Get all categories.

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "id": 1,
      "name": "Instagram",
      "description": "Instagram services",
      "status": "active"
    }
  ]
}
```

### Create Category
**POST** `/categories`

Create a category (Seller/Admin only).

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "name": "Instagram",
  "description": "Instagram services"
}
```

---

## Transaction Endpoints

### Get Transactions
**GET** `/transactions?page=1&limit=50&type=deposit`

Get user transactions.

**Headers:**
- `Authorization: Bearer {token}`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `type` (optional): Filter by type (deposit, withdrawal, order, refund)

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "type": "deposit",
      "amount": 100.00,
      "balance_before": 0.00,
      "balance_after": 100.00,
      "description": "Deposit via PayPal",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

### Add Funds
**POST** `/transactions/deposit`

Add funds to account (Client only).

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "amount": 100.00,
  "payment_method": "paypal"
}
```

---

## Ticket Endpoints

### Get Tickets
**GET** `/tickets?status=open`

Get user tickets.

**Headers:**
- `Authorization: Bearer {token}`

**Query Parameters:**
- `status` (optional): Filter by status (open, answered, closed)

### Create Ticket
**POST** `/tickets`

Create a support ticket (Client only).

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "subject": "Order Issue",
  "message": "My order is not completing",
  "priority": "high"
}
```

### Get Ticket Details
**GET** `/tickets/:id`

Get ticket with messages.

**Headers:**
- `Authorization: Bearer {token}`

### Add Message to Ticket
**POST** `/tickets/:id/messages`

Add a message to a ticket.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "message": "Thank you for your response"
}
```

---

## External API Endpoints

These endpoints are for external integrations (SMM providers, etc.).

### Create Order via API
**POST** `/external/order`

**Headers:**
- `X-API-Key: {api_key}`

**Request Body:**
```json
{
  "service_id": 1,
  "link": "https://instagram.com/username",
  "quantity": 1000,
  "user_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "order_id": 123,
  "status": "pending",
  "price": 10.00
}
```

### Update Order Status via API
**POST** `/external/order/:id/status`

**Headers:**
- `X-API-Key: {api_key}`

**Request Body:**
```json
{
  "status": "completed",
  "start_count": 5000,
  "remains": 0
}
```

### Sync Services via API
**POST** `/external/services/sync`

**Headers:**
- `X-API-Key: {api_key}`

**Request Body:**
```json
{
  "services": [
    {
      "api_service_id": "IG_FOLLOWERS_001",
      "category_id": 1,
      "name": "Instagram Followers",
      "description": "High quality",
      "price": 0.01,
      "reseller_price": 0.008,
      "min_quantity": 100,
      "max_quantity": 10000,
      "speed": "fast"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Services synced successfully",
  "synced": 10,
  "updated": 5
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "success": false,
  "message": "Error message here",
  "errors": [...] // Optional validation errors
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Authentication endpoints have stricter rate limiting:
- 5 requests per 15 minutes

Other endpoints:
- 100 requests per 15 minutes

---

## Notes

1. All prices are in the currency specified in settings (default: USD)
2. All timestamps are in ISO 8601 format (UTC)
3. JWT tokens expire after 7 days (configurable)
4. API keys for external endpoints should be implemented based on your needs
5. All monetary values are stored with 4 decimal precision

