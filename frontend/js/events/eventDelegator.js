/**
 * eventDelegator.js
 * Implements high-performance global centralized event delegation for the SPA pages.
 * Attaches event listeners at the document level, making dynamic template loads immune to listener loss.
 */

export const eventDelegator = {
    /**
     * Initializes global event listeners by delegating targeted actions.
     * @param {object} handlers - Object mapping action names to handler callbacks
     */
    init(handlers) {
        console.log('Centralized global event delegator initializing...');

        // 1. Click Listener: Handles view task, edit task, delete task, pagination shifts, restores, and perm-deletes.
        document.addEventListener('click', (e) => {
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

            // Restore soft deleted task
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

            // Pagination Link change page
            const link = target.closest('.change-page-btn');
            if (link) {
                e.preventDefault();
                const page = parseInt(link.getAttribute('data-page'), 10);
                if (!isNaN(page) && handlers.onPageChange) {
                    handlers.onPageChange(page);
                }
            }
        });

        // 2. Change Listener: Handles dynamic checkbox completions and filters.
        document.addEventListener('change', (e) => {
            const target = e.target;

            // Task Completion Checkbox state toggling
            if (target.classList.contains('toggle-task-completion')) {
                const id = parseInt(target.getAttribute('data-id'), 10);
                const isCompleted = target.checked;
                if (handlers.onToggleCompletion) handlers.onToggleCompletion(id, isCompleted);
                return;
            }

            // All Tasks view Priority dropdown filter
            if (target.id === 'filter-priority') {
                if (handlers.onFilterPriority) handlers.onFilterPriority(target.value);
                return;
            }

            // All Tasks view Status dropdown filter
            if (target.id === 'filter-status') {
                if (handlers.onFilterStatus) handlers.onFilterStatus(target.value);
                return;
            }
        });

        // 3. Keydown Listener: Handles enter keys on dynamic text search filters.
        document.addEventListener('keydown', (e) => {
            const target = e.target;
            if (target.id === 'search-input' && e.key === 'Enter') {
                e.preventDefault();
                if (handlers.onSearch) handlers.onSearch(target.value.trim());
            }
        });
    }
};
