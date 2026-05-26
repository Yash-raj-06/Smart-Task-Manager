/**
 * baseApi.js
 * Centralized, reusable API client wrapper using vanilla fetch.
 * Implements strict separation of concerns and reusable get, post, put, and remove helpers.
 */

const API_BASE_URL = 'http://localhost:5241/api';


class BaseApi {
    /**
     * Executes an HTTP request and standardizes responses.
     * @param {string} endpoint - API resource endpoint (e.g. '/tasks')
     * @param {object} options - Fetch options
     */
    async request(endpoint, options = {}) {
        const method = options.method || 'GET';
        // Append cache-busting timestamp to all GET requests to prevent browser caching
        const separator = endpoint.includes('?') ? '&' : '?';
        const finalEndpoint = method.toUpperCase() === 'GET' ? `${endpoint}${separator}_t=${Date.now()}` : endpoint;
        const url = `${API_BASE_URL}${finalEndpoint}`;
        
        // Disable browser caching via fetch configurations and headers
        options.cache = 'no-store';
        options.headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...(options.headers || {})
        };

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                // Return structured error message if available
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error(`[API Error] Request failed on ${url}:`, error);
            throw error;
        }
    }

    /**
     * Reusable GET request helper.
     * @param {string} endpoint 
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    /**
     * Reusable POST request helper.
     * @param {string} endpoint 
     * @param {object} body 
     */
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    /**
     * Reusable PUT request helper.
     * @param {string} endpoint 
     * @param {object} body 
     */
    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined
        });
    }

    /**
     * Reusable DELETE request helper (called 'remove').
     * @param {string} endpoint 
     */
    async remove(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Global singleton instance for app-wide imports
const baseApi = new BaseApi();
export default baseApi;
export { API_BASE_URL };
