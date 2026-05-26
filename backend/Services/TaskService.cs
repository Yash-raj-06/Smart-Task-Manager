using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.DTOs;
using backend.Models;
using backend.Repositories.Interfaces;

namespace backend.Services
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _repository;

        public TaskService(ITaskRepository repository)
        {
            _repository = repository;
        }

        private TaskDto MapToDto(TaskItem task)
        {
            return new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Project = task.Project,
                Priority = task.Priority,
                DueDate = task.DueDate,
                IsCompleted = task.IsCompleted,
                CompletedAt = task.CompletedAt.HasValue ? DateTime.SpecifyKind(task.CompletedAt.Value, DateTimeKind.Utc) : null,
                IsDeleted = task.IsDeleted,
                DeletedAt = task.DeletedAt.HasValue ? DateTime.SpecifyKind(task.DeletedAt.Value, DateTimeKind.Utc) : null,
                CreatedAt = DateTime.SpecifyKind(task.CreatedAt, DateTimeKind.Utc),
                UpdatedAt = DateTime.SpecifyKind(task.UpdatedAt, DateTimeKind.Utc)
            };
        }

        private DateTime ParseAndNormalizeDueDate(DateTime dueDate, string? dueTime, bool validateFuture = true)
        {
            var finalDueDate = dueDate.Date;

            if (!string.IsNullOrWhiteSpace(dueTime) && TimeSpan.TryParse(dueTime, out var parsedTime))
            {
                finalDueDate = finalDueDate.Add(parsedTime);
            }
            else
            {
                // Default to 11:59:59 PM (23:59:59)
                finalDueDate = finalDueDate.Add(new TimeSpan(23, 59, 59));
            }

            if (validateFuture)
            {
                // Enforce date validation: no past dates. Today allowed.
                if (finalDueDate.Date < DateTime.Today)
                {
                    throw new ArgumentException("Past dates are not allowed. Today or future dates only.");
                }

                // Enforce time validation: if today, the time must be in the future.
                if (finalDueDate.Date == DateTime.Today && finalDueDate < DateTime.Now)
                {
                    throw new ArgumentException("Due Time must be in the future for today's date.");
                }
            }

            return finalDueDate;
        }



        public async Task<TaskDto?> GetTaskByIdAsync(int id)
        {
            var task = await _repository.GetByIdAsync(id);
            return task != null ? MapToDto(task) : null;
        }

        public async Task<(IEnumerable<TaskDto> Tasks, int TotalCount)> GetTasksPagedAsync(string? search, string? priority, string? status, int skip, int take)
        {
            // Auto cleanup trash items older than 30 days
            await _repository.CleanupExpiredTrashAsync(30);

            var tasks = await _repository.GetAllAsync(search, priority, status, skip, take);
            var totalCount = await _repository.GetCountAsync(search, priority, status);

            return (tasks.Select(MapToDto), totalCount);
        }

        public async Task<TaskDto> CreateTaskAsync(CreateTaskDto createTaskDto)
        {
            // Perform date/time normalization and validation
            var finalDueDate = ParseAndNormalizeDueDate(createTaskDto.DueDate, createTaskDto.DueTime, validateFuture: true);

            var task = new TaskItem
            {
                Title = createTaskDto.Title.Trim(),
                Description = createTaskDto.Description?.Trim(),
                Project = string.IsNullOrWhiteSpace(createTaskDto.Project) ? "General" : createTaskDto.Project.Trim(),
                Priority = createTaskDto.Priority.ToLower(),
                DueDate = finalDueDate,
                IsCompleted = false,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var created = await _repository.AddAsync(task);
            return MapToDto(created);
        }

        public async Task<TaskDto?> UpdateTaskAsync(int id, UpdateTaskDto updateTaskDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null || existing.IsDeleted)
            {
                return null;
            }

            // Helper to normalize null and empty strings for safe comparison
            string NormalizeString(string? str) => str?.Trim() ?? string.Empty;

            // Check if the only thing changing is the completion status (pure toggle)
            bool isOnlyTogglingCompletion = 
                NormalizeString(existing.Title) == NormalizeString(updateTaskDto.Title) &&
                NormalizeString(existing.Description) == NormalizeString(updateTaskDto.Description) &&
                NormalizeString(existing.Project) == NormalizeString(updateTaskDto.Project) &&
                NormalizeString(existing.Priority) == NormalizeString(updateTaskDto.Priority).ToLower();

            // Determine if the due date/time is actually being changed
            var parsedProposedDate = ParseAndNormalizeDueDate(updateTaskDto.DueDate, updateTaskDto.DueTime, validateFuture: false);
            
            // Helper to compare dates up to the minute (ignoring seconds & milliseconds)
            bool DateTimesAreEqualUpToMinute(DateTime dt1, DateTime dt2)
            {
                return dt1.Year == dt2.Year &&
                       dt1.Month == dt2.Month &&
                       dt1.Day == dt2.Day &&
                       dt1.Hour == dt2.Hour &&
                       dt1.Minute == dt2.Minute;
            }

            // Only validate if the proposed date/time is different from the existing date/time,
            // AND we are NOT simply toggling the completion status.
            bool shouldValidate = !isOnlyTogglingCompletion && !DateTimesAreEqualUpToMinute(parsedProposedDate, existing.DueDate);

            var finalDueDate = ParseAndNormalizeDueDate(updateTaskDto.DueDate, updateTaskDto.DueTime, validateFuture: shouldValidate);

            // Detect if there are changes
            bool hasChanges = NormalizeString(existing.Title) != NormalizeString(updateTaskDto.Title) ||
                              NormalizeString(existing.Description) != NormalizeString(updateTaskDto.Description) ||
                              NormalizeString(existing.Project) != NormalizeString(updateTaskDto.Project) ||
                              NormalizeString(existing.Priority) != NormalizeString(updateTaskDto.Priority).ToLower() ||
                              !DateTimesAreEqualUpToMinute(existing.DueDate, finalDueDate) ||
                              existing.IsCompleted != updateTaskDto.IsCompleted;

            if (!hasChanges)
            {
                // Return a marker to indicate no changes detected
                var unchangedDto = MapToDto(existing);
                unchangedDto.Title = "NO_CHANGES_DETECTED"; // Set a marker property
                return unchangedDto;
            }

            // Apply updates
            existing.Title = updateTaskDto.Title.Trim();
            existing.Description = updateTaskDto.Description?.Trim();
            existing.Project = string.IsNullOrWhiteSpace(updateTaskDto.Project) ? "General" : updateTaskDto.Project.Trim();
            existing.Priority = updateTaskDto.Priority.ToLower();
            existing.DueDate = finalDueDate;
            
            if (existing.IsCompleted != updateTaskDto.IsCompleted)
            {
                existing.IsCompleted = updateTaskDto.IsCompleted;
                existing.CompletedAt = updateTaskDto.IsCompleted ? DateTime.UtcNow : null;
            }

            existing.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(existing);
            return MapToDto(existing);
        }

        public async Task<bool> SoftDeleteTaskAsync(int id)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null || existing.IsDeleted)
            {
                return false;
            }

            existing.IsDeleted = true;
            existing.DeletedAt = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(existing);
            return true;
        }

        public async Task<bool> RestoreTaskAsync(int id)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null || !existing.IsDeleted)
            {
                return false;
            }

            existing.IsDeleted = false;
            existing.DeletedAt = null;
            existing.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(existing);
            return true;
        }

        public async Task<bool> PermanentDeleteTaskAsync(int id)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null || !existing.IsDeleted)
            {
                return false;
            }

            await _repository.DeleteAsync(existing);
            return true;
        }

        public async Task<IEnumerable<TaskDto>> GetTrashTasksAsync()
        {
            // Auto cleanup trash items older than 30 days
            await _repository.CleanupExpiredTrashAsync(30);

            var trash = await _repository.GetTrashAsync();
            return trash.Select(MapToDto);
        }

        public async Task<object> GetDashboardDataAsync()
        {
            // Auto cleanup trash items older than 30 days
            await _repository.CleanupExpiredTrashAsync(30);

            var pendingCount = await _repository.GetPendingCountAsync();
            var completedCount = await _repository.GetCompletedCountAsync();
            var overdueCount = await _repository.GetOverdueCountAsync();

            var todayTasks = await _repository.GetTodayTasksAsync();
            var overdueTasks = await _repository.GetOverdueTasksAsync();

            return new
            {
                PendingCount = pendingCount,
                CompletedCount = completedCount,
                OverdueCount = overdueCount,
                TodayTasks = todayTasks.Select(MapToDto),
                OverdueTasks = overdueTasks.Select(MapToDto)
            };
        }
    }
}
