/**
 * taskValidation.js
 * Frontend validation helpers to ensure inputs conform to business schemas.
 */

/**
 * Parses a 24-hour time string (e.g. "15:39", "08:15") into hours and minutes.
 * @param {string} timeStr 
 * @returns {{hours: number, minutes: number}|null}
 */
export function parse24HourTime(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    
    return { hours, minutes };
}

export const taskValidation = {
    /**
     * Validates task creation/modification inputs.
     * @param {object} data - Form data containing { title, description, priority, dueDate, dueTime, project }
     * @returns {object} { isValid: boolean, errors: object }
     */
    validateTask(data) {
        const errors = {};

        // 1. Title Validation
        if (!data.title || typeof data.title !== 'string') {
            errors.title = 'Task Title is required.';
        } else {
            const trimmedTitle = data.title.trim();
            if (trimmedTitle.length < 3) {
                errors.title = 'Title must be at least 3 characters.';
            } else if (trimmedTitle.length > 100) {
                errors.title = 'Title cannot exceed 100 characters.';
            } else if (/^\s*$/.test(trimmedTitle)) {
                errors.title = 'Title cannot consist only of spaces.';
            }
        }

        // 2. Description Validation (optional)
        if (data.description && data.description.trim().length > 300) {
            errors.description = 'Description cannot exceed 300 characters.';
        }

        // 3. Priority Validation
        const validPriorities = ['low', 'medium', 'high'];
        if (!data.priority || !validPriorities.includes(data.priority.toLowerCase())) {
            errors.priority = 'Please select a valid task Priority.';
        }

        // 4. Due Date & Time Validation
        if (!data.dueDate) {
            errors.dueDate = 'Due Date is required.';
        } else {
            const inputDate = new Date(data.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const inputDateNormalized = new Date(inputDate);
            inputDateNormalized.setHours(0, 0, 0, 0);

            if (inputDateNormalized < today) {
                errors.dueDate = 'Past dates are not allowed. Today or future dates only.';
            } else if (inputDateNormalized.getTime() === today.getTime()) {
                // If it is exactly today, check time if provided
                if (data.dueTime) {
                    const parsedTime = parse24HourTime(data.dueTime);
                    if (parsedTime) {
                        const now = new Date();
                        const inputMinutes = parsedTime.hours * 60 + parsedTime.minutes;
                        const currentMinutes = now.getHours() * 60 + now.getMinutes();

                        if (inputMinutes < currentMinutes) {
                            errors.dueTime = 'Due Time must be in the future for today\'s date.';
                        }
                    } else {
                        errors.dueTime = 'Please select a valid time format.';
                    }
                }
            }
        }

        // 5. Project/Group validation (optional)
        if (data.project && data.project.trim().length > 50) {
            errors.project = 'Project name cannot exceed 50 characters.';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

