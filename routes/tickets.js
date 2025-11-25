const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { paginate } = require('../utils/helpers');
const { DEMO_MODE, mockDB } = require('../config/demo-mode');

// Get user tickets
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { page = 1, limit = 20, status } = req.query;
        const { offset, limit: limitNum } = paginate(page, limit);

        // Demo Mode
        if (DEMO_MODE) {
            let tickets = [];
            if (role === 'client') {
                tickets = mockDB.getTickets(userId, { status });
            } else {
                tickets = [...mockDB.tickets];
                if (status) {
                    tickets = tickets.filter(t => t.status === status);
                }
            }

            return res.json({
                success: true,
                tickets: tickets.slice(offset, offset + limitNum)
            });
        }

        // Real Mode
        let query = '';
        let params = [];

        if (role === 'client') {
            query = 'SELECT * FROM tickets WHERE user_id = ?';
            params = [userId];
        } else {
            // Admin/Seller can see all tickets
            query = `
                SELECT t.*, u.username, u.email
                FROM tickets t
                JOIN users u ON t.user_id = u.id
                WHERE 1=1
            `;
            params = [];
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const [tickets] = await pool.execute(query, params);

        res.json({
            success: true,
            tickets
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets'
        });
    }
});

// Get single ticket with messages
router.get('/:id', authenticate, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const userId = req.user.id;
        const role = req.user.role;

        // Demo Mode
        if (DEMO_MODE) {
            let ticket = mockDB.tickets.find(t => t.id === ticketId);
            
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            if (role === 'client' && ticket.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this ticket'
                });
            }

            const messages = mockDB.getTicketMessages(ticketId);

            return res.json({
                success: true,
                ticket,
                messages
            });
        }

        // Real Mode
        // Get ticket
        let query = 'SELECT * FROM tickets WHERE id = ?';
        let params = [ticketId];

        if (role === 'client') {
            query += ' AND user_id = ?';
            params.push(userId);
        }

        const [tickets] = await pool.execute(query, params);

        if (tickets.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Get messages
        const [messages] = await pool.execute(
            `SELECT tm.*, u.username, u.email
             FROM ticket_messages tm
             JOIN users u ON tm.user_id = u.id
             WHERE tm.ticket_id = ?
             ORDER BY tm.created_at ASC`,
            [ticketId]
        );

        res.json({
            success: true,
            ticket: tickets[0],
            messages
        });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket'
        });
    }
});

// Create ticket (Client)
router.post('/', authenticate, authorize('client'), sanitizeInput, async (req, res) => {
    try {
        const { subject, message, priority } = req.body;
        const userId = req.user.id;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Subject and message are required'
            });
        }

        // Demo Mode
        if (DEMO_MODE) {
            const result = mockDB.createTicket({
                user_id: userId,
                subject,
                status: 'open',
                priority: priority || 'medium'
            });

            const ticketId = result.insertId;

            mockDB.addTicketMessage({
                ticket_id: ticketId,
                user_id: userId,
                message,
                is_admin: false
            });

            return res.status(201).json({
                success: true,
                message: 'Ticket created successfully (Demo Mode)',
                ticket_id: ticketId
            });
        }

        // Real Mode
        // Create ticket
        const [result] = await pool.execute(
            'INSERT INTO tickets (user_id, subject, status, priority) VALUES (?, ?, ?, ?)',
            [userId, subject, 'open', priority || 'medium']
        );

        const ticketId = result.insertId;

        // Add first message
        await pool.execute(
            'INSERT INTO ticket_messages (ticket_id, user_id, message, is_admin) VALUES (?, ?, ?, ?)',
            [ticketId, userId, message, false]
        );

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            ticket_id: ticketId
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket'
        });
    }
});

// Add message to ticket
router.post('/:id/messages', authenticate, sanitizeInput, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { message } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Demo Mode
        if (DEMO_MODE) {
            const ticket = mockDB.tickets.find(t => t.id === ticketId);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            if (role === 'client' && ticket.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this ticket'
                });
            }

            mockDB.addTicketMessage({
                ticket_id: ticketId,
                user_id: userId,
                message,
                is_admin: role === 'admin' || role === 'seller'
            });

            // Update ticket status
            if (ticket.status === 'closed') {
                ticket.status = 'open';
            } else if (role === 'admin' || role === 'seller') {
                ticket.status = 'answered';
            }

            return res.json({
                success: true,
                message: 'Message added successfully (Demo Mode)'
            });
        }

        // Real Mode
        // Verify ticket access
        const [tickets] = await pool.execute(
            'SELECT * FROM tickets WHERE id = ?',
            [ticketId]
        );

        if (tickets.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = tickets[0];

        if (role === 'client' && ticket.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this ticket'
            });
        }

        // Add message
        await pool.execute(
            'INSERT INTO ticket_messages (ticket_id, user_id, message, is_admin) VALUES (?, ?, ?, ?)',
            [ticketId, userId, message, role === 'admin' || role === 'seller']
        );

        // Update ticket status
        if (ticket.status === 'closed') {
            await pool.execute(
                'UPDATE tickets SET status = ? WHERE id = ?',
                ['open', ticketId]
            );
        } else if (role === 'admin' || role === 'seller') {
            await pool.execute(
                'UPDATE tickets SET status = ? WHERE id = ?',
                ['answered', ticketId]
            );
        }

        res.json({
            success: true,
            message: 'Message added successfully'
        });
    } catch (error) {
        console.error('Add message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add message'
        });
    }
});

// Update ticket status (Admin/Seller)
router.patch('/:id/status', authenticate, authorize('admin', 'seller'), sanitizeInput, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { status } = req.body;

        const validStatuses = ['open', 'answered', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        await pool.execute(
            'UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, ticketId]
        );

        res.json({
            success: true,
            message: 'Ticket status updated successfully'
        });
    } catch (error) {
        console.error('Update ticket status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket status'
        });
    }
});

module.exports = router;

