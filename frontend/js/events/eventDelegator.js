/**
 * eventDelegator.js
 * Implements high-performance centralized event delegation for Taskify list actions.
 * Avoids attaching individual event listeners to thousands of dynamic buttons.
 */

export const eventDelegator = {
    /**
     * Initializes global action listeners by delegating target actions.
     * @param {object} handlers - Object mapping action names to handler callbacks
     */
    init(handlers) {
        // 1. Delegate active tasks table body actions
        const tableBody = document.querySelector('#task-table-body');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const target = e.target;

                // View task details
                const viewBtn = target.closest('.view-task-details');
                if (viewBtn) {
                    const id = parseInt(viewBtn.getAttribute('data-id'), 10);
                    if (handlers.onView) handlers.onView(id);
                    return;
                }

                // Edit task trigger
                const editBtn = target.closest('.edit-task-trigger');
                if (editBtn) {
                    const id = parseInt(editBtn.getAttribute('data-id'), 10);
                    if (handlers.onEditTrigger) handlers.onEditTrigger(id);
                    return;
                }

                // Soft delete task
                const deleteBtn = target.closest('.soft-delete-task');
                if (deleteBtn) {
                    const id = parseInt(deleteBtn.getAttribute('data-id'), 10);
                    if (handlers.onSoftDelete) handlers.onSoftDelete(id);
                    return;
                }
            });

            // Toggle task completion checkbox
            tableBody.addEventListener('change', (e) => {
                const target = e.target;
                if (target.classList.contains('toggle-task-completion')) {
                    const id = parseInt(target.getAttribute('data-id'), 10);
                    const isCompleted = target.checked;
                    if (handlers.onToggleCompletion) handlers.onToggleCompletion(id, isCompleted);
                }
            });

            // Toggle task completion checkbox on Today card
            const todayScheduleList = document.querySelector('#today-schedule-list');
            if (todayScheduleList) {
                todayScheduleList.addEventListener('change', (e) => {
                    const target = e.target;
                    if (target.classList.contains('toggle-task-completion')) {
                        const id = parseInt(target.getAttribute('data-id'), 10);
                        const isCompleted = target.checked;
                        if (handlers.onToggleCompletion) handlers.onToggleCompletion(id, isCompleted);
                    }
                });
            }
        }

        // 2. Delegate pagination navigation container
        const paginationNav = document.querySelector('#pagination-nav');
        if (paginationNav) {
            paginationNav.addEventListener('click', (e) => {
                const link = e.target.closest('.change-page-btn');
                if (link) {
                    e.preventDefault();
                    const page = parseInt(link.getAttribute('data-page'), 10);
                    if (!isNaN(page) && handlers.onPageChange) {
                        handlers.onPageChange(page);
                    }
                }
            });
        }

        // 3. Delegate Trash drawer list actions
        const trashContainer = document.querySelector('#trash-list');
        if (trashContainer) {
            trashContainer.addEventListener('click', (e) => {
                const target = e.target;

                // Restore task
                const restoreBtn = target.closest('.restore-task-btn');
                if (restoreBtn) {
                    const id = parseInt(restoreBtn.getAttribute('data-id'), 10);
                    if (handlers.onRestore) handlers.onRestore(id);
                    return;
                }

                // Permanent Delete task
                const permDeleteBtn = target.closest('.permanent-delete-btn');
                if (permDeleteBtn) {
                    const id = parseInt(permDeleteBtn.getAttribute('data-id'), 10);
                    if (handlers.onPermanentDelete) handlers.onPermanentDelete(id);
                    return;
                }
            });
        }

        // 4. Delegate schedule feeds
        const scheduleList = document.querySelector('#today-schedule-list');
        if (scheduleList) {
            scheduleList.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-task-details');
                if (viewBtn) {
                    const id = parseInt(viewBtn.getAttribute('data-id'), 10);
                    if (handlers.onView) handlers.onView(id);
                }
            });
        }

        const overdueList = document.querySelector('#overdue-items-list');
        if (overdueList) {
            overdueList.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-task-details');
                if (viewBtn) {
                    const id = parseInt(viewBtn.getAttribute('data-id'), 10);
                    if (handlers.onView) handlers.onView(id);
                    return;
                }

                const resolveBtn = e.target.closest('.view-task-details');
                if (resolveBtn) {
                    const id = parseInt(resolveBtn.getAttribute('data-id'), 10);
                    if (handlers.onView) handlers.onView(id);
                }
            });
        }
    }
};
