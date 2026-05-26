/**
 * taskUI.js
 * Centralized DOM rendering module for Taskify frontend.
 * Manages tables, pagination, stats cards, modals, loading states, and toasts.
 */

export const taskUI = {
    // DOM selectors cache
    selectors: {
        taskTableBody: '#task-table-body',
        paginationNav: '#pagination-nav',
        metricPending: '#metric-pending-count',
        metricCompleted: '#metric-completed-count',
        metricOverdue: '#metric-overdue-count',
        todayScheduleList: '#today-schedule-list',
        overdueItemsList: '#overdue-items-list',
        trashList: '#trash-list',
        toastContainer: '#toast-container',
        taskDetailsModal: '#task-view-modal',
        taskFormModal: '#task-form-modal',
        taskForm: '#task-creation-form',
        modalTitle: '#task-form-modal-title',
        submitBtn: '#task-submit-btn'
    },

    /**
     * Formats a priority string into a badge with consistent color dots.
     */
    getPriorityBadgeHtml(priority) {
        if (!priority) return '';
        const lower = priority.toLowerCase();
        let dot = '🟢';
        if (lower === 'high') dot = '🔴';
        else if (lower === 'medium') dot = '🟡';
        
        const capitalized = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
        return `<span class="badge badge-priority badge-priority-${lower}">${dot} ${capitalized}</span>`;
    },

    /**
     * Render the active tasks table with custom paginated entries.
     */

    renderTasks(tasks, totalCount, currentPage = 1, pageSize = 5) {
        const tableBody = document.querySelector(this.selectors.taskTableBody);
        const pagination = document.querySelector(this.selectors.paginationNav);
        if (!tableBody) return;

        // Clear table body
        tableBody.innerHTML = '';

        if (!tasks || tasks.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5 text-muted">
                        <span class="material-symbols-outlined fs-1 d-block mb-2">assignment_late</span>
                        No active tasks found matching your selection.
                    </td>
                </tr>
            `;
            if (pagination) pagination.innerHTML = '';
            return;
        }

        // Render rows
        tasks.forEach(task => {
            const formattedDate = new Date(task.dueDate).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const formattedTime = new Date(task.dueDate).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit'
            });

            const isChecked = task.isCompleted ? 'checked' : '';
            const titleClass = task.isCompleted ? 'task-title-checked' : '';
            
            // Check if task is overdue (not completed and past due)
            const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
            const dateColorClass = isOverdue ? 'text-danger fw-semibold' : '';
            const timeColorClass = isOverdue ? 'text-danger opacity-75' : 'text-muted';
            const titleColorClass = isOverdue ? 'text-danger fw-bold' : '';

            const row = document.createElement('tr');
            row.className = 'task-row fade-in-section';
            row.innerHTML = `
                <td style="width: 45px;">
                    <div class="task-checkbox-wrapper">
                        <input type="checkbox" class="task-checkbox toggle-task-completion" data-id="${task.id}" ${isChecked}>
                        <div class="task-checkbox-display"></div>
                    </div>
                </td>
                <td>
                    <div class="fw-semibold text-wrap ${titleClass} ${titleColorClass}">${this.escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="small text-muted text-truncate mt-1" style="max-width: 280px;">${this.escapeHtml(task.description)}</div>` : ''}
                </td>
                <td>
                    <span class="project-pill">
                        <span class="material-symbols-outlined me-1" style="font-size: 0.85rem;">folder</span>
                        ${this.escapeHtml(task.project || 'General')}
                    </span>
                </td>
                <td>
                    ${this.getPriorityBadgeHtml(task.priority)}
                </td>

                <td>
                    <div class="small ${dateColorClass}">${formattedDate}</div>
                    <div class="small ${timeColorClass}">${formattedTime}</div>
                </td>
                <td class="text-end">
                    <div class="d-inline-flex gap-1">
                        <button class="action-btn-circle view-task-details" data-id="${task.id}" title="View Details">
                            <span class="material-symbols-outlined" style="font-size: 1.15rem;">visibility</span>
                        </button>
                        <button class="action-btn-circle edit edit-task-trigger" data-id="${task.id}" title="Edit Task">
                            <span class="material-symbols-outlined" style="font-size: 1.15rem;">edit</span>
                        </button>
                        <button class="action-btn-circle delete soft-delete-task" data-id="${task.id}" title="Move to Trash">
                            <span class="material-symbols-outlined" style="font-size: 1.15rem;">delete</span>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Render centered pagination controls
        this.renderPagination(totalCount, currentPage, pageSize);
    },

    renderPagination(totalCount, currentPage, pageSize) {
        const paginationNav = document.querySelector(this.selectors.paginationNav);
        if (!paginationNav) return;

        paginationNav.innerHTML = '';

        const totalPages = Math.ceil(totalCount / pageSize) || 1;

        const container = document.createElement('div');
        container.className = 'custom-pagination-container';

        // Prev Button
        const isPrevDisabled = currentPage === 1;
        const prevBtn = document.createElement('button');
        prevBtn.className = 'custom-page-btn change-page-btn';
        prevBtn.setAttribute('data-page', (currentPage - 1).toString());
        if (isPrevDisabled) {
            prevBtn.disabled = true;
        }
        prevBtn.innerHTML = `
            <span class="material-symbols-outlined">chevron_left</span>
        `;
        container.appendChild(prevBtn);

        // Next Button
        const isNextDisabled = currentPage === totalPages || totalPages <= 1;
        const nextBtn = document.createElement('button');
        nextBtn.className = 'custom-page-btn change-page-btn';
        nextBtn.setAttribute('data-page', (currentPage + 1).toString());
        if (isNextDisabled) {
            nextBtn.disabled = true;
        }
        nextBtn.innerHTML = `
            <span class="material-symbols-outlined">chevron_right</span>
        `;
        container.appendChild(nextBtn);

        paginationNav.appendChild(container);
    },

    /**
     * Renders beautiful stat metric cards and lists on the dashboard view.
     */
    renderDashboard({ pendingCount, completedCount, overdueCount, todayTasks, overdueTasks }) {
        // Update core Bento Metrics
        const pendingEl = document.querySelector(this.selectors.metricPending);
        const completedEl = document.querySelector(this.selectors.metricCompleted);
        const overdueEl = document.querySelector(this.selectors.metricOverdue);

        if (pendingEl) pendingEl.textContent = pendingCount;
        if (completedEl) completedEl.textContent = completedCount;
        if (overdueEl) overdueEl.textContent = overdueCount;

        // Render Today's Schedule Feed
        const todayList = document.querySelector(this.selectors.todayScheduleList);
        if (todayList) {
            todayList.innerHTML = '';
            if (!todayTasks || todayTasks.length === 0) {
                todayList.innerHTML = `
                    <div class="text-center py-4 text-muted small">
                        <span class="material-symbols-outlined fs-2 d-block mb-1 opacity-70">event_available</span>
                        No tasks scheduled for today.
                    </div>
                `;
            } else {
                todayTasks.forEach(task => {
                    const timeStr = new Date(task.dueDate).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const isChecked = task.isCompleted ? 'checked' : '';
                    const titleClass = task.isCompleted ? 'task-title-checked' : '';
                    const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
                    const titleColorClass = isOverdue ? 'text-danger fw-bold' : '';

                    const div = document.createElement('div');
                    div.className = 'd-flex justify-content-between align-items-center mb-3 border-bottom pb-2';
                    div.innerHTML = `
                        <div class="d-flex align-items-center gap-3">
                            <div class="task-checkbox-wrapper">
                                <input type="checkbox" class="task-checkbox toggle-task-completion" data-id="${task.id}" ${isChecked}>
                                <div class="task-checkbox-display"></div>
                            </div>
                            <div>
                                <div class="fw-semibold text-truncate ${titleClass} ${titleColorClass}" style="max-width: 180px;">${this.escapeHtml(task.title)}</div>
                                <div class="mt-1">${this.getPriorityBadgeHtml(task.priority)}</div>
                            </div>
                        </div>

                        <div class="text-end">
                            <span class="small text-primary fw-medium">${timeStr}</span>
                        </div>
                    `;
                    todayList.appendChild(div);
                });
            }
        }

        // Render Overdue Tasks Alert Feed
        const overdueList = document.querySelector(this.selectors.overdueItemsList);
        if (overdueList) {
            overdueList.innerHTML = '';
            if (!overdueTasks || overdueTasks.length === 0) {
                overdueList.innerHTML = `
                    <div class="text-center py-4 text-muted small">
                        <span class="material-symbols-outlined fs-2 d-block mb-1 opacity-70">verified</span>
                        Awesome! No overdue tasks.
                    </div>
                `;
            } else {
                overdueTasks.forEach(task => {
                    const daysAgo = Math.ceil((Date.now() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                    const labelStr = daysAgo <= 1 ? 'Overdue today' : `Overdue by ${daysAgo} days`;

                    const div = document.createElement('div');
                    div.className = 'd-flex justify-content-between align-items-center mb-3 border-bottom pb-2';
                    div.innerHTML = `
                        <div>
                            <div class="fw-semibold text-truncate" style="max-width: 180px;">${this.escapeHtml(task.title)}</div>
                            <div class="small text-danger mt-1 fw-medium" style="font-size: 0.75rem;">
                                <span class="material-symbols-outlined align-middle" style="font-size: 0.9rem;">error</span>
                                ${labelStr}
                            </div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-danger view-task-details py-1 px-2" data-id="${task.id}" style="font-size: 0.75rem;">
                                Resolve
                            </button>
                        </div>
                    `;
                    overdueList.appendChild(div);
                });
            }
        }
    },

    /**
     * Render items inside the trash drawer.
     */
    renderTrash(trashTasks) {
        const trashContainer = document.querySelector(this.selectors.trashList);
        if (!trashContainer) return;

        trashContainer.innerHTML = '';

        if (!trashTasks || trashTasks.length === 0) {
            trashContainer.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <span class="material-symbols-outlined fs-1 d-block mb-2 opacity-50">delete_sweep</span>
                    Your trash drawer is completely empty.
                </div>
            `;
            return;
        }

        trashTasks.forEach(task => {
            const deletedDate = task.deletedAt ? new Date(task.deletedAt).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Unknown';

            const item = document.createElement('div');
            item.className = 'glass-panel glass-danger-card p-3 mb-3 fade-in-section';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div style="max-width: 70%;">
                        <div class="fw-bold text-truncate">${this.escapeHtml(task.title)}</div>
                        ${task.description ? `<div class="small text-muted text-wrap mt-1" style="font-size: 0.8rem;">${this.escapeHtml(task.description)}</div>` : ''}
                        
                        <div class="mt-2 d-flex flex-wrap gap-1 align-items-center">
                            <span class="project-pill" style="font-size: 0.7rem;">
                                <span class="material-symbols-outlined me-1" style="font-size: 0.8rem;">folder</span>
                                ${this.escapeHtml(task.project || 'General')}
                            </span>
                            ${this.getPriorityBadgeHtml(task.priority)}
                        </div>

                        <div class="small text-muted mt-2" style="font-size: 0.7rem;">
                            Deleted: ${deletedDate}
                        </div>
                    </div>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline-success restore-task-btn" data-id="${task.id}" title="Restore Task">
                            <span class="material-symbols-outlined align-middle" style="font-size: 1rem;">settings_backup_restore</span>
                        </button>
                        <button class="btn btn-sm btn-outline-danger permanent-delete-btn" data-id="${task.id}" title="Delete Permanently">
                            <span class="material-symbols-outlined align-middle" style="font-size: 1rem;">delete_forever</span>
                        </button>
                    </div>
                </div>
            `;
            trashContainer.appendChild(item);
        });
    },

    /**
     * Renders detailed task metadata in the Bento details view modal.
     */
    renderTaskDetails(task) {
        const titleEl = document.getElementById('view-task-title');
        const descEl = document.getElementById('view-task-description');
        const projectEl = document.getElementById('view-task-project');
        const priorityEl = document.getElementById('view-task-priority');
        const dateEl = document.getElementById('view-task-due-date');
        const createdEl = document.getElementById('view-task-created');
        const updatedEl = document.getElementById('view-task-updated');

        if (titleEl) titleEl.textContent = task.title;
        if (descEl) descEl.textContent = task.description || 'No description provided for this task.';
        
        if (projectEl) {
            const project = task.project || 'General';
            projectEl.innerHTML = `
                <span class="badge rounded-pill px-3 py-1.5 fw-semibold text-uppercase text-muted border border-outline-variant" style="font-size: 0.75rem; letter-spacing: 0.05em; background-color: var(--color-surface-container-high) !important; color: var(--color-on-surface-variant) !important; border: 1px solid var(--color-outline) !important;">
                    ${this.escapeHtml(project)}
                </span>
            `;
        }

        if (priorityEl) {
            const priority = task.priority || 'medium';
            const lower = priority.toLowerCase();
            let bgStyle = '';
            
            if (lower === 'high') {
                bgStyle = 'background-color: #e11d48 !important; color: #ffffff !important;';
            } else if (lower === 'medium') {
                bgStyle = 'background-color: #d97706 !important; color: #ffffff !important;';
            } else {
                bgStyle = 'background-color: #16a34a !important; color: #ffffff !important;';
            }
            
            const capitalized = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
            priorityEl.innerHTML = `
                <span class="badge rounded-pill px-3 py-1.5 fw-semibold text-uppercase tracking-wider" style="font-size: 0.75rem; letter-spacing: 0.05em; ${bgStyle}">
                    ${capitalized} Priority
                </span>
            `;
        }

        const formatDateTime = (dateStr, isUtc = false) => {
            if (!dateStr) return '-';
            
            if (isUtc) {
                // UTC date from server - needs to be parsed as UTC and formatted in Asia/Kolkata
                let utcStr = dateStr;
                if (typeof dateStr === 'string' && !utcStr.endsWith('Z') && !utcStr.includes('+')) {
                    utcStr = utcStr + 'Z';
                }
                const d = new Date(utcStr);
                const dateFormatted = d.toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                const timeFormatted = d.toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return `${dateFormatted}, ${timeFormatted}`;
            } else {
                // Local due date from server - display EXACTLY what is in the string, no timezone shifts
                try {
                    const parts = dateStr.split('T');
                    const dateParts = parts[0].split('-');
                    const timeParts = parts[1] ? parts[1].split(':') : ['00', '00'];
                    
                    const year = parseInt(dateParts[0], 10);
                    const month = parseInt(dateParts[1], 10);
                    const day = parseInt(dateParts[2], 10);
                    const hour = parseInt(timeParts[0], 10);
                    const minute = parseInt(timeParts[1], 10);
                    
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const monthStr = monthNames[month - 1] || 'Jan';
                    
                    const period = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                    const displayHourStr = String(displayHour).padStart(2, '0');
                    const displayMinuteStr = String(minute).padStart(2, '0');
                    
                    return `${day} ${monthStr} ${year}, ${displayHourStr}:${displayMinuteStr} ${period}`;
                } catch (e) {
                    const d = new Date(dateStr);
                    return d.toLocaleString('en-IN');
                }
            }
        };

        if (dateEl) {
            dateEl.textContent = formatDateTime(task.dueDate, false);
        }

        if (createdEl) {
            createdEl.textContent = formatDateTime(task.createdAt, true);
        }

        if (updatedEl) {
            updatedEl.textContent = formatDateTime(task.updatedAt || task.createdAt, true);
        }
    },

    /**
     * Displays a premium top-right dynamic toast notification.
     */
    showToast(message, type = 'success') {
        const container = document.querySelector(this.selectors.toastContainer);
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0 show mb-2 fade-in-section`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.style.minWidth = '240px';

        const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';

        toast.innerHTML = `
            <div class="d-flex p-3">
                <span class="material-symbols-outlined me-2 align-middle">${icon}</span>
                <div class="toast-body p-0 fw-medium">${message}</div>
                <button type="button" class="btn-close m-auto me-0" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        container.appendChild(toast);

        // Auto remove toast after 3.5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    /**
     * Visual skeleton screens while retrieving server requests.
     */
    showSkeleton() {
        const tableBody = document.querySelector(this.selectors.taskTableBody);
        if (!tableBody) return;

        tableBody.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const skeletonRow = document.createElement('tr');
            skeletonRow.innerHTML = `
                <td><div class="placeholder-glow"><span class="placeholder col-12 rounded" style="height: 20px;"></span></div></td>
                <td><div class="placeholder-glow"><span class="placeholder col-8 rounded" style="height: 20px;"></span></div></td>
                <td><div class="placeholder-glow"><span class="placeholder col-6 rounded" style="height: 20px;"></span></div></td>
                <td><div class="placeholder-glow"><span class="placeholder col-4 rounded" style="height: 20px;"></span></div></td>
                <td><div class="placeholder-glow"><span class="placeholder col-8 rounded" style="height: 20px;"></span></div></td>
                <td><div class="placeholder-glow"><span class="placeholder col-10 rounded" style="height: 20px;"></span></div></td>
            `;
            tableBody.appendChild(skeletonRow);
        }
    },

    /**
     * Updates the visual validation state of a specific form field.
     * @param {string|HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} selectorOrEl - Element or its selector
     * @param {boolean|null} isValid - true if valid (green), false if invalid (red), null if neutral
     * @param {string} errorMessage - Error message to display if invalid
     */
    setFieldState(selectorOrEl, isValid, errorMessage = '') {
        const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
        if (!el) return;

        // Find or create feedback element
        let feedbackEl = el.parentNode.querySelector('.invalid-feedback');
        
        if (isValid === false) {
            el.classList.add('is-invalid');
            el.classList.remove('is-valid');
            
            if (!feedbackEl) {
                feedbackEl = document.createElement('div');
                feedbackEl.className = 'invalid-feedback';
                el.parentNode.appendChild(feedbackEl);
            }
            feedbackEl.textContent = errorMessage;
        } else if (isValid === true) {
            el.classList.add('is-valid');
            el.classList.remove('is-invalid');
            if (feedbackEl) {
                feedbackEl.remove();
            }
        } else {
            // Neutral state
            el.classList.remove('is-valid', 'is-invalid');
            if (feedbackEl) {
                feedbackEl.remove();
            }
        }
    },

    /**
     * Resets all validation states and feedback elements on a given form.
     * @param {string|HTMLFormElement} formSelectorOrEl 
     */
    resetFormValidation(formSelectorOrEl) {
        const form = typeof formSelectorOrEl === 'string' ? document.querySelector(formSelectorOrEl) : formSelectorOrEl;
        if (!form) return;
        
        form.querySelectorAll('.glass-input, .form-control, .form-select').forEach(el => {
            this.setFieldState(el, null);
        });
    },

    /**
     * Prevents XSS sanitizing text inputs.
     */
    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

