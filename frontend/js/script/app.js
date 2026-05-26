/**
 * app.js
 * Main SPA Controller. Orchestrates application state, routes, forms, validation, and APIs.
 */

import taskApi from '../api/taskApi.js';
import { taskUI } from '../ui/taskUI.js';
import { taskValidation } from '../validation/taskValidation.js';
import { eventDelegator } from '../events/eventDelegator.js';

class App {
    constructor() {
        // App State
        this.state = {
            currentPage: 1,
            pageSize: 4,
            searchQuery: '',
            priorityFilter: 'all',
            statusFilter: 'all',
            editingTaskId: null,
            activeSection: 'dashboard'
        };

        // Modal Instances (Bootstrap)
        this.modals = {
            form: null,
            view: null,
            confirm: null
        };

        // Flatpickr Instances
        this.flatpickrs = {
            dueDate: null,
            dueTime: null
        };
    }

    /**
     * Start the SPA application
     */
    async init() {
        console.log('Taskify app initializing...');
        
        // Initialize Bootstrap Modals
        this.modals.form = new bootstrap.Modal(document.getElementById('task-form-modal'));
        this.modals.view = new bootstrap.Modal(document.getElementById('task-view-modal'));
        this.modals.confirm = new bootstrap.Modal(document.getElementById('task-confirm-modal'));

        // Initialize Flatpickr instances
        this.initFlatpickr();

        // Initialize Theme Setup
        this.initTheme();

        // Bind DOM Header Buttons and Filters
        this.bindStaticEvents();

        // Initialize Event Delegation
        this.initEventDelegation();

        // Set up hash change routing listener
        window.addEventListener('hashchange', () => this.handleHashChange());

        // Load default section from URL hash or default to dashboard
        const initialSection = window.location.hash.replace('#', '') || 'dashboard';
        await this.navigate(initialSection);
    }


    /**
     * Initializes Flatpickr calendars with responsive configurations.
     */
    initFlatpickr() {
        this.flatpickrs.dueDate = flatpickr("#form-due-date", {
            dateFormat: "Y-m-d",
            minDate: "today",
            disableMobile: true,
            onChange: (selectedDates) => {
                this.triggerRealTimeFieldValidation("dueDate");
                this.updateTimePickerConstraints(selectedDates[0]);
            }
        });
    }

    /**
     * Restricts the native time picker min values based on selected date
     */
    updateTimePickerConstraints(selectedDate) {
        const timeInput = document.getElementById('form-due-time');
        if (!timeInput) return;

        if (!selectedDate) {
            timeInput.removeAttribute('min');
            return;
        }

        const today = new Date();
        const isToday = selectedDate.getFullYear() === today.getFullYear() &&
                        selectedDate.getMonth() === today.getMonth() &&
                        selectedDate.getDate() === today.getDate();

        if (isToday) {
            const currentHours = today.getHours();
            const currentMinutes = today.getMinutes();
            const minTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
            
            timeInput.setAttribute('min', minTimeStr);
            this.triggerRealTimeFieldValidation("dueTime");
        } else {
            timeInput.removeAttribute('min');
        }
    }


    /**
     * Load Light/Dark mode state from storage and bind toggle button
     */
    initTheme() {
        const body = document.body;
        const themeBtn = document.getElementById('theme-toggle-btn');
        
        // Default to dark mode
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'dark') {
            body.classList.add('dark');
        } else {
            body.classList.remove('dark');
        }

        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                body.classList.toggle('dark');
                const currentTheme = body.classList.contains('dark') ? 'dark' : 'light';
                localStorage.setItem('theme', currentTheme);
            });
        }
    }

    /**
     * Bind static events like filters, search, modal buttons, and section switches.
     */
    bindStaticEvents() {
        // SPA Sidebar navigation buttons
        const navBtns = document.querySelectorAll('.nav-item-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const section = btn.getAttribute('data-section');
                if (section) {
                    await this.navigate(section);
                }
            });
        });

        // Mobile sidebar drawer toggles
        const menuTrigger = document.getElementById('mobile-menu-trigger');
        const sidebar = document.getElementById('sidebar');
        if (menuTrigger && sidebar) {
            menuTrigger.addEventListener('click', () => {
                sidebar.classList.toggle('show');
            });
            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (sidebar.classList.contains('show') && 
                    !sidebar.contains(e.target) && 
                    !menuTrigger.contains(e.target)) {
                    sidebar.classList.remove('show');
                }
            });
        }

        // Creation Form Submission
        const taskForm = document.getElementById('task-creation-form');
        if (taskForm) {
            taskForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleFormSubmit();
            });
        }

        // Modal backdrop blurring hooks
        const appWrapper = document.getElementById('app-content-wrapper');
        const formModalEl = document.getElementById('task-form-modal');
        const viewModalEl = document.getElementById('task-view-modal');
        const confirmModalEl = document.getElementById('task-confirm-modal');

        const addBlur = () => appWrapper?.classList.add('blur-active');
        const removeBlur = () => {
            // Remove blur only if no modal is currently shown
            if (!formModalEl?.classList.contains('show') && 
                !viewModalEl?.classList.contains('show') && 
                !confirmModalEl?.classList.contains('show')) {
                appWrapper?.classList.remove('blur-active');
            }
        };

        if (formModalEl) {
            formModalEl.addEventListener('show.bs.modal', addBlur);
            formModalEl.addEventListener('hidden.bs.modal', () => {
                removeBlur();
                this.resetForm();
            });
        }

        if (viewModalEl) {
            viewModalEl.addEventListener('show.bs.modal', addBlur);
            viewModalEl.addEventListener('hidden.bs.modal', removeBlur);
        }

        if (confirmModalEl) {
            confirmModalEl.addEventListener('show.bs.modal', addBlur);
            confirmModalEl.addEventListener('hidden.bs.modal', removeBlur);
        }

        // Add task button trigger
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                this.state.editingTaskId = null;
                document.getElementById('task-form-modal-title').textContent = 'Create New Task';
                document.getElementById('task-submit-btn').innerHTML = `
                    <span class="material-symbols-outlined align-middle me-1">add</span> Create Task
                `;
                this.modals.form.show();
            });
        }

        // Bind real-time input event listeners for instant validation styling
        const validationFields = ['title', 'desc', 'project', 'priority', 'due-time'];
        validationFields.forEach(f => {
            const input = document.getElementById(`form-${f}`);
            if (input) {
                const eventName = input.tagName === 'SELECT' || f === 'due-time' ? 'change' : 'input';
                input.addEventListener(eventName, () => {
                    const valKey = f === 'desc' ? 'description' : (f === 'due-time' ? 'dueTime' : f);
                    this.triggerRealTimeFieldValidation(valKey);
                });
                input.addEventListener('blur', () => {
                    const valKey = f === 'desc' ? 'description' : (f === 'due-time' ? 'dueTime' : f);
                    this.triggerRealTimeFieldValidation(valKey);
                });
            }
        });
    }


    /**
     * Initializes decentralized delegated actions inside tables/drawers
     */
    initEventDelegation() {
        eventDelegator.init({
            // View details
            onView: async (id) => {
                try {
                    const response = await taskApi.getTaskById(id);
                    if (response.success) {
                        taskUI.renderTaskDetails(response.data);
                        this.modals.view.show();
                    }
                } catch (error) {
                    taskUI.showToast(error.message || 'Failed to load task details.', 'error');
                }
            },

            // Trigger Edit Form
            onEditTrigger: async (id) => {
                try {
                    const response = await taskApi.getTaskById(id);
                    if (response.success) {
                        this.populateFormForEdit(response.data);
                        this.modals.form.show();
                    }
                } catch (error) {
                    taskUI.showToast(error.message || 'Failed to fetch task.', 'error');
                }
            },

            // Toggle task completion check
            onToggleCompletion: async (id, isCompleted) => {
                try {
                    // Fetch existing, update completion status
                    const details = await taskApi.getTaskById(id);
                    if (details.success) {
                        const original = details.data;
                        
                        // Extract original time component from dueDate to prevent the backend from defaulting to 23:59:59
                        const originalDate = new Date(original.dueDate);
                        const hours = String(originalDate.getHours()).padStart(2, '0');
                        const minutes = String(originalDate.getMinutes()).padStart(2, '0');
                        const extractedTime = `${hours}:${minutes}`;

                        const updatePayload = {
                            title: original.title,
                            description: original.description,
                            project: original.project,
                            priority: original.priority ? original.priority.toLowerCase() : 'medium',
                            dueDate: original.dueDate,
                            dueTime: extractedTime,
                            isCompleted: isCompleted
                        };
                        const response = await taskApi.updateTask(id, updatePayload);
                        if (response.success) {
                            taskUI.showToast(
                                isCompleted ? 'Task completed! Excellent work.' : 'Task status reverted to pending.',
                                'success'
                            );
                            await this.refreshActiveView();
                        }
                    }
                } catch (error) {
                    taskUI.showToast(error.message || 'Failed to update task state.', 'error');
                }
            },

            // Soft delete task
            onSoftDelete: async (id) => {
                this.showConfirmModal(
                    'Move Task to Trash?',
                    'Are you sure you want to move this task to the trash drawer?',
                    false,
                    async () => {
                        try {
                            const response = await taskApi.softDeleteTask(id);
                            if (response.success) {
                                taskUI.showToast('Task added to trash.', 'error');
                                await this.refreshActiveView();
                            }
                        } catch (error) {
                            taskUI.showToast(error.message || 'Failed to soft delete task.', 'error');
                        }
                    }
                );
            },

            // Restore from Trash drawer
            onRestore: async (id) => {
                try {
                    const response = await taskApi.restoreTask(id);
                    if (response.success) {
                        taskUI.showToast('Task successfully restored!', 'success');
                        await this.refreshActiveView();
                    }
                } catch (error) {
                    taskUI.showToast(error.message || 'Failed to restore task.', 'error');
                }
            },

            // Permanent deletion
            onPermanentDelete: async (id) => {
                this.showConfirmModal(
                    'Delete Task Permanently?',
                    'WARNING: This action cannot be undone. Are you sure you want to permanently delete this task?',
                    true,
                    async () => {
                        try {
                            const response = await taskApi.permanentDeleteTask(id);
                            if (response.success) {
                                taskUI.showToast('Task permanently deleted.', 'error');
                                await this.refreshActiveView();
                            }
                        } catch (error) {
                            taskUI.showToast(error.message || 'Failed to permanently delete task.', 'error');
                        }
                    }
                );
            },

            // Keyboard Search submission
            onSearch: async (query) => {
                this.state.searchQuery = query;
                this.state.currentPage = 1;
                await this.refreshTaskList();
            },

            // Priority dropdown filter change
            onFilterPriority: async (priority) => {
                this.state.priorityFilter = priority;
                this.state.currentPage = 1;
                await this.refreshTaskList();
            },

            // Status dropdown filter change
            onFilterStatus: async (status) => {
                this.state.statusFilter = status;
                this.state.currentPage = 1;
                await this.refreshTaskList();
            },

            // Change table page
            onPageChange: async (page) => {
                this.state.currentPage = page;
                await this.refreshTaskList();
            }
        });
    }

    /**
     * Shows a premium glassmorphic confirmation modal instead of a native browser confirm dialog.
     */
    showConfirmModal(title, message, isPermanent, onConfirm) {
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-message').textContent = message;
        
        const iconEl = document.querySelector('#task-confirm-modal .material-symbols-outlined');
        const containerEl = document.querySelector('#task-confirm-modal .rounded-circle');
        const confirmBtn = document.getElementById('confirm-modal-btn');
        
        if (isPermanent) {
            confirmBtn.className = 'btn btn-danger rounded-pill px-4 fs-8 fw-semibold';
            confirmBtn.textContent = 'Permanently Delete';
            containerEl.className = 'd-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle mb-3 animate-pulse';
            iconEl.textContent = 'delete_forever';
        } else {
            confirmBtn.className = 'btn btn-warning text-white rounded-pill px-4 fs-8 fw-semibold';
            confirmBtn.textContent = 'Move to Trash';
            containerEl.className = 'd-inline-flex align-items-center justify-content-center bg-warning-subtle text-warning rounded-circle mb-3';
            iconEl.textContent = 'delete';
        }

        // Replace action button listener to clear previous event bindings
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(newConfirmBtn);
        
        newConfirmBtn.addEventListener('click', () => {
            this.modals.confirm.hide();
            onConfirm();
        });

        this.modals.confirm.show();
    }

    /**
     * SPA Section Switch Router.
     * Updates URL hash to trigger unified routing workflow.
     */
    async navigate(sectionKey) {
        if (window.location.hash !== `#${sectionKey}`) {
            window.location.hash = sectionKey;
        } else {
            await this.handleHashChange();
        }
    }

    /**
     * Asynchronously loads page HTML partial templates and refreshes the data view.
     */
    async handleHashChange() {
        const sectionKey = window.location.hash.replace('#', '') || 'dashboard';
        this.state.activeSection = sectionKey;

        // Toggle Sidebar Nav highlighters
        const navBtns = document.querySelectorAll('.nav-item-btn');
        navBtns.forEach(btn => {
            if (btn.getAttribute('data-section') === sectionKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Mobile menu cleanup on toggle clicks
        document.getElementById('sidebar')?.classList.remove('show');

        // Dynamic file maps
        const sectionPageMap = {
            'dashboard': 'pages/dashboard.html',
            'task-list': 'pages/taskList.html',
            'trash': 'pages/trash.html'
        };

        const pagePath = sectionPageMap[sectionKey] || 'pages/dashboard.html';

        try {
            const response = await fetch(pagePath);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${response.statusText}`);
            }
            const html = await response.text();
            
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = html;

                // Sync UI filters state if loading the active task-list view
                if (sectionKey === 'task-list') {
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) searchInput.value = this.state.searchQuery;

                    const priorityFilter = document.getElementById('filter-priority');
                    if (priorityFilter) priorityFilter.value = this.state.priorityFilter;

                    const statusFilter = document.getElementById('filter-status');
                    if (statusFilter) statusFilter.value = this.state.statusFilter;
                }
            }
        } catch (error) {
            console.error('SPA dynamic loader error:', error);
            taskUI.showToast('Failed to load page content.', 'error');
        }

        // Trigger dynamic view loader routines
        await this.refreshActiveView();
    }

    /**
     * Refresh data in the currently active SPA section
     */
    async refreshActiveView() {
        if (this.state.activeSection === 'dashboard') {
            await this.refreshDashboard();
        } else if (this.state.activeSection === 'task-list') {
            await this.refreshTaskList();
        } else if (this.state.activeSection === 'trash') {
            await this.refreshTrash();
        }
    }

    /**
     * Retrieve and render Dashboard Metrics
     */
    async refreshDashboard() {
        try {
            const response = await taskApi.getDashboard();
            if (response.success) {
                taskUI.renderDashboard(response.data);
            }
        } catch (error) {
            taskUI.showToast('Failed to load dashboard statistics.', 'error');
        }
    }

    /**
     * Retrieve and render Active Paginated Tasks Table
     */
    async refreshTaskList() {
        try {
            taskUI.showSkeleton();
            const response = await taskApi.getTasks({
                search: this.state.searchQuery,
                priority: this.state.priorityFilter,
                status: this.state.statusFilter,
                skip: (this.state.currentPage - 1) * this.state.pageSize,
                take: this.state.pageSize
            });

            if (response.success) {
                taskUI.renderTasks(
                    response.data.tasks,
                    response.data.totalCount,
                    this.state.currentPage,
                    this.state.pageSize
                );
            }
        } catch (error) {
            taskUI.showToast('Failed to load tasks list.', 'error');
        }
    }

    /**
     * Retrieve and render Soft deleted trash items list
     */
    async refreshTrash() {
        try {
            const response = await taskApi.getTrash();
            if (response.success) {
                taskUI.renderTrash(response.data);
            }
        } catch (error) {
            taskUI.showToast('Failed to load trash drawer.', 'error');
        }
    }

    /**
     * populates form values to set modal to edit state
     */
    populateFormForEdit(task) {
        this.state.editingTaskId = task.id;
        document.getElementById('task-form-modal-title').textContent = 'Edit Task Details';
        document.getElementById('task-submit-btn').innerHTML = `
            <span class="material-symbols-outlined align-middle me-1">save</span> Save Changes
        `;

        document.getElementById('form-title').value = task.title;
        document.getElementById('form-desc').value = task.description || '';
        document.getElementById('form-project').value = task.project || '';
        document.getElementById('form-priority').value = task.priority.toLowerCase();

        // Extract and map date & time values
        if (task.dueDate) {
            const dateObj = new Date(task.dueDate);
            const localDate = dateObj.getFullYear() + '-' + 
                              String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(dateObj.getDate()).padStart(2, '0');
            
            // Format time in 24-hour format (e.g. "14:30") for native HTML5 input
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            const localTimeStr = `${hours}:${minutes}`;

            if (this.flatpickrs.dueDate) {
                this.flatpickrs.dueDate.setDate(localDate, false);
            } else {
                document.getElementById('form-due-date').value = localDate;
            }

            document.getElementById('form-due-time').value = localTimeStr;

            // Update constraints based on populated date
            this.updateTimePickerConstraints(dateObj);
        } else {
            if (this.flatpickrs.dueDate) this.flatpickrs.dueDate.clear();
            document.getElementById('form-due-time').value = '';
        }
    }

    /**
     * Submits form values to API endpoint. Normalizes local time, performs client checks.
     */
    async handleFormSubmit() {
        const titleVal = document.getElementById('form-title').value;
        const descVal = document.getElementById('form-desc').value;
        const projectVal = document.getElementById('form-project').value;
        const priorityVal = document.getElementById('form-priority').value;
        const dateVal = document.getElementById('form-due-date').value;
        const timeVal = document.getElementById('form-due-time').value;

        // Construct input payload
        const formData = {
            title: titleVal,
            description: descVal,
            project: projectVal,
            priority: priorityVal,
            dueDate: dateVal,
            dueTime: timeVal
        };

        // Client validation check
        const validation = taskValidation.validateTask(formData);

        if (!validation.isValid) {
            // Apply validation styles for all fields
            const allFields = ['title', 'description', 'project', 'priority', 'dueDate', 'dueTime'];
            allFields.forEach(field => {
                const elKey = field === 'description' ? 'desc' : field;
                const inputEl = document.getElementById(`form-${elKey}`);
                const errorMsg = validation.errors[field];
                if (errorMsg) {
                    taskUI.setFieldState(inputEl, false, errorMsg);
                } else {
                    const isRequired = ['title', 'dueDate', 'priority'].includes(field);
                    const value = formData[field];
                    if (isRequired || (value && value.trim().length > 0)) {
                        taskUI.setFieldState(inputEl, true);
                    } else {
                        taskUI.setFieldState(inputEl, null);
                    }
                }
            });
            return;
        }

        // Safe timezone-independent date construction:
        const dateParts = formData.dueDate.split('-');
        const baseDate = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));

        // Parse 24-hour time and build combined date object
        let combinedDate = baseDate;
        let normalizedTimeStr = null;

        if (formData.dueTime) {
            const match = formData.dueTime.match(/^(\d{1,2}):(\d{2})$/);
            if (match) {
                const hours = parseInt(match[1], 10);
                const minutes = parseInt(match[2], 10);
                
                combinedDate.setHours(hours, minutes, 0, 0);
                normalizedTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            } else {
                // Fallback: end of day
                combinedDate.setHours(23, 59, 59, 999);
            }
        } else {
            // Default to end of day if no time specified
            combinedDate.setHours(23, 59, 59, 999);
        }

        const pad = (num) => String(num).padStart(2, '0');
        const localIsoString = `${combinedDate.getFullYear()}-${pad(combinedDate.getMonth() + 1)}-${pad(combinedDate.getDate())}T${pad(combinedDate.getHours())}:${pad(combinedDate.getMinutes())}:${pad(combinedDate.getSeconds())}`;

        try {
            if (this.state.editingTaskId) {
                // Perform modification update
                const details = await taskApi.getTaskById(this.state.editingTaskId);
                if (details.success) {
                    const original = details.data;
                    const updatePayload = {
                        title: formData.title,
                        description: formData.description,
                        project: formData.project,
                        priority: formData.priority,
                        dueDate: localIsoString,
                        dueTime: normalizedTimeStr,
                        isCompleted: original.isCompleted
                    };

                    const response = await taskApi.updateTask(this.state.editingTaskId, updatePayload);
                    if (response.success) {
                        if (response.message === "No changes detected") {
                            taskUI.showToast('No changes detected in task details.', 'info');
                        } else {
                            taskUI.showToast('Task details successfully updated!', 'success');
                        }
                        this.modals.form.hide();
                        await this.refreshActiveView();
                    }
                }
            } else {
                // Perform creation action
                const creationPayload = {
                    title: formData.title,
                    description: formData.description,
                    project: formData.project,
                    priority: formData.priority,
                    dueDate: localIsoString,
                    dueTime: normalizedTimeStr
                };
                const response = await taskApi.createTask(creationPayload);
                if (response.success) {
                    taskUI.showToast('New task successfully created!', 'success');
                    this.modals.form.hide();
                    await this.refreshActiveView();
                }
            }
        } catch (error) {
            taskUI.showToast(error.message || 'Failed to submit task data.', 'error');
        }
    }

    /**
     * Clear form input values and reset invalid highlight borders
     */
    resetForm() {
        document.getElementById('task-creation-form').reset();
        if (this.flatpickrs.dueDate) this.flatpickrs.dueDate.clear();
        const timeInput = document.getElementById('form-due-time');
        if (timeInput) {
            timeInput.value = '';
            timeInput.removeAttribute('min');
        }
        taskUI.resetFormValidation('#task-creation-form');
        this.state.editingTaskId = null;
    }

    /**
     * Triggers real-time visual validation on a specific field
     * @param {string} fieldName - e.g. "title", "dueDate", "dueTime", etc.
     */
    triggerRealTimeFieldValidation(fieldName) {
        const titleVal = document.getElementById('form-title').value;
        const descVal = document.getElementById('form-desc').value;
        const projectVal = document.getElementById('form-project').value;
        const priorityVal = document.getElementById('form-priority').value;
        const dateVal = document.getElementById('form-due-date').value;
        const timeVal = document.getElementById('form-due-time').value;

        const formData = {
            title: titleVal,
            description: descVal,
            project: projectVal,
            priority: priorityVal,
            dueDate: dateVal,
            dueTime: timeVal
        };

        const validation = taskValidation.validateTask(formData);
        
        // Map elements appropriately
        const elKey = fieldName === 'description' ? 'desc' : fieldName;
        const inputEl = document.getElementById(`form-${elKey}`);
        if (!inputEl) return;

        const errorMsg = validation.errors[fieldName];
        const isRequired = ['title', 'dueDate', 'priority'].includes(fieldName);

        if (errorMsg) {
            taskUI.setFieldState(inputEl, false, errorMsg);
        } else {
            const value = formData[fieldName];
            if (isRequired || (value && value.trim().length > 0)) {
                taskUI.setFieldState(inputEl, true);
            } else {
                taskUI.setFieldState(inputEl, null);
            }
        }
    }
}


// Instantiate and launch core controller when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
