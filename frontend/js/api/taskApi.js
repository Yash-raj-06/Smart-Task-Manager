/**
 * taskApi.js
 * Task-specific API connectors mapped directly to the backend REST routes.
 */

import baseApi from './baseApi.js';

const taskApi = {
    /**
     * Retrieves a paginated, filtered, and searched list of active tasks.
     */
    async getTasks({ search = '', priority = 'all', status = 'all', skip = 0, take = 5 } = {}) {
        const queryParams = new URLSearchParams({
            search,
            priority,
            status,
            skip: skip.toString(),
            take: take.toString()
        });
        return baseApi.get(`/tasks?${queryParams.toString()}`);
    },

    /**
     * Fetches detailed data for a specific task.
     */
    async getTaskById(id) {
        return baseApi.get(`/tasks/${id}`);
    },

    /**
     * Submits a payload to create a new task.
     */
    async createTask(taskData) {
        return baseApi.post('/tasks', taskData);
    },

    /**
     * Updates an existing task's attributes.
     */
    async updateTask(id, taskData) {
        return baseApi.put(`/tasks/${id}`, taskData);
    },

    /**
     * Moves a task to the trash drawer (soft delete).
     */
    async softDeleteTask(id) {
        return baseApi.remove(`/tasks/${id}`);
    },

    /**
     * Restores a soft-deleted task from the trash.
     */
    async restoreTask(id) {
        return baseApi.put(`/tasks/${id}/restore`);
    },

    /**
     * Permanently purges a task from the database.
     */
    async permanentDeleteTask(id) {
        return baseApi.remove(`/tasks/${id}/permanent`);
    },

    /**
     * Fetches central dashboard metrics (stats, schedules).
     */
    async getDashboard() {
        return baseApi.get('/tasks/dashboard');
    },

    /**
     * Fetches list of soft-deleted trash tasks.
     */
    async getTrash() {
        return baseApi.get('/tasks/trash');
    }
};

export default taskApi;
