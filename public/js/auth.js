// Authentication utilities
const API_BASE_URL = '/api';

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Set token in localStorage
function setToken(token) {
    localStorage.setItem('token', token);
}

// Remove token from localStorage
function removeToken() {
    localStorage.removeItem('token');
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Set current user
function setCurrentUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Remove current user
function removeCurrentUser() {
    localStorage.removeItem('user');
}

// Check if user is authenticated
function isAuthenticated() {
    return getToken() !== null;
}

// Get auth headers
function getAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        ...getAuthHeaders(),
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle non-JSON responses
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (parseError) {
                throw new Error('Invalid JSON response from server');
            }
        } else {
            const text = await response.text();
            throw new Error(text || 'Request failed');
        }

        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized - check if we have a token
                const token = getToken();
                if (!token) {
                    // No token at all - redirect to login
                    removeToken();
                    removeCurrentUser();
                    // Only redirect if we're not already on login page
                    if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
                        window.location.href = '/login.html';
                    }
                    return null;
                }
                // Token exists but server rejected it - might be demo mode or API not available
                // Don't redirect - just return error to allow mock data fallback
                // This prevents login loop when API is not available
                return null;
            }
            throw new Error(data.message || data.error || `Request failed (${response.status})`);
        }

        return data;
    } catch (error) {
        // console.error('API request error:', error);
        // Don't show notification for authentication errors or network errors in demo mode
        // Don't throw error - return null to allow fallback to mock data
        // This prevents login loop when API is not available
        if (error.message && !error.message.includes('401') && !error.message.includes('Authentication failed')) {
            // Only show notification for non-auth errors
            if (typeof showNotification === 'function') {
                // Don't show notification for network errors in demo mode
                if (!error.message.includes('Network error') && !error.message.includes('Failed to fetch')) {
                    // Silent fail - don't show notification
                }
            }
        }
        // Return null instead of throwing to allow mock data fallback
        return null;
    }
}

// Login function
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            throw new Error('Server error: Invalid response format');
        }

        if (!response.ok) {
            const errorMsg = data.message || data.error || `Login failed (${response.status})`;
            throw new Error(errorMsg);
        }

        if (data.success && data.token) {
            setToken(data.token);
            if (data.user) {
                setCurrentUser(data.user);
            }
            return data;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        // console.error('Login error:', error);
        // Re-throw with better error message
        if (error.message) {
            throw error;
        }
        throw new Error('Network error. Please check your connection.');
    }
}

// Register function
async function register(username, email, password, referralCode = null) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, referral_code: referralCode })
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            throw new Error('Server error: Invalid response format');
        }

        if (!response.ok) {
            // Handle validation errors
            if (data.errors && Array.isArray(data.errors)) {
                const errorMessages = data.errors.map(err => err.msg || err.message).join(', ');
                throw new Error(errorMessages || data.message || 'Registration failed');
            }
            const errorMsg = data.message || data.error || `Registration failed (${response.status})`;
            throw new Error(errorMsg);
        }

        if (data.success && data.token) {
            setToken(data.token);
            if (data.user) {
                setCurrentUser(data.user);
            }
            return data;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        // console.error('Register error:', error);
        // Re-throw with better error message
        if (error.message) {
            throw error;
        }
        throw new Error('Network error. Please check your connection.');
    }
}

// Logout function
function logout() {
    removeToken();
    removeCurrentUser();
    window.location.href = '/login.html';
}

// Check authentication on page load
function checkAuth() {
    const currentPage = window.location.pathname;
    const publicPages = ['/login.html', '/register.html', '/index.html', '/'];
    
    // Don't check auth on public pages
    if (publicPages.includes(currentPage)) {
        return;
    }
    
    // Check if user is authenticated (has token in localStorage)
    // Only check token existence - don't validate with API to avoid redirect loops
    const token = getToken();
    const user = getCurrentUser();
    
    if (!token || !user) {
        // No token or user data - redirect to login
        // But only if we're not already on login page
        if (currentPage !== '/login.html' && currentPage !== '/register.html') {
            window.location.href = '/login.html';
        }
        return;
    }
    
    // User has token and user data - allow access to protected pages
    // Don't make API calls here to avoid redirect loops
}

// Initialize auth check on page load (only for protected pages)
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const currentPage = window.location.pathname;
        const publicPages = ['/login.html', '/register.html', '/index.html', '/'];
        if (!publicPages.includes(currentPage)) {
            checkAuth();
        }
    });
}

