using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Repositories.Interfaces;

namespace backend.Repositories
{
    public class TaskRepository : ITaskRepository
    {
        private readonly AppDbContext _context;

        public TaskRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<TaskItem?> GetByIdAsync(int id)
        {
            return await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        }

        private IQueryable<TaskItem> BuildFilteredQuery(string? search, string? priority, string? status)
        {
            var query = _context.Tasks.Where(t => !t.IsDeleted);

            // Searching title/description
            if (!string.IsNullOrWhiteSpace(search))
            {
                var cleanSearch = search.Trim().ToLower();
                query = query.Where(t => t.Title.ToLower().Contains(cleanSearch) || 
                                         (t.Description != null && t.Description.ToLower().Contains(cleanSearch)));
            }

            // Filtering priority
            if (!string.IsNullOrWhiteSpace(priority) && priority != "all")
            {
                query = query.Where(t => t.Priority.ToLower() == priority.Trim().ToLower());
            }

            // Filtering status (completed, pending, overdue)
            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                var cleanStatus = status.Trim().ToLower();
                if (cleanStatus == "completed")
                {
                    query = query.Where(t => t.IsCompleted);
                }
                else if (cleanStatus == "pending")
                {
                    query = query.Where(t => !t.IsCompleted && t.DueDate >= DateTime.Now);
                }
                else if (cleanStatus == "overdue")
                {
                    query = query.Where(t => !t.IsCompleted && t.DueDate < DateTime.Now);
                }
            }

            return query;
        }

        public async Task<IEnumerable<TaskItem>> GetAllAsync(string? search, string? priority, string? status, int skip, int take)
        {
            var query = BuildFilteredQuery(search, priority, status);

            // Active (pending/overdue) tasks first, completed tasks last, each sorted by due date ascending
            return await query
                .OrderBy(t => t.IsCompleted)
                .ThenBy(t => t.DueDate)
                .Skip(skip)
                .Take(take)
                .ToListAsync();
        }

        public async Task<int> GetCountAsync(string? search, string? priority, string? status)
        {
            return await BuildFilteredQuery(search, priority, status).CountAsync();
        }

        public async Task<TaskItem> AddAsync(TaskItem task)
        {
            await _context.Tasks.AddAsync(task);
            await _context.SaveChangesAsync();
            return task;
        }

        public async Task UpdateAsync(TaskItem task)
        {
            task.UpdatedAt = DateTime.UtcNow;
            _context.Tasks.Update(task);
            _context.Entry(task).Property(t => t.UpdatedAt).IsModified = true;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(TaskItem task)
        {
            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<TaskItem>> GetTrashAsync()
        {
            // Fetch soft deleted items, ordered by DeletedAt descending
            return await _context.Tasks
                .Where(t => t.IsDeleted)
                .OrderByDescending(t => t.DeletedAt)
                .ToListAsync();
        }

        public async Task<int> CleanupExpiredTrashAsync(int daysLimit)
        {
            var threshold = DateTime.UtcNow.AddDays(-daysLimit);
            var expiredTasks = await _context.Tasks
                .Where(t => t.IsDeleted && t.DeletedAt != null && t.DeletedAt < threshold)
                .ToListAsync();

            if (expiredTasks.Any())
            {
                _context.Tasks.RemoveRange(expiredTasks);
                return await _context.SaveChangesAsync();
            }

            return 0;
        }

        public async Task<int> GetPendingCountAsync()
        {
            return await _context.Tasks.CountAsync(t => !t.IsDeleted && !t.IsCompleted);
        }

        public async Task<int> GetCompletedCountAsync()
        {
            return await _context.Tasks.CountAsync(t => !t.IsDeleted && t.IsCompleted);
        }

        public async Task<int> GetOverdueCountAsync()
        {
            return await _context.Tasks.CountAsync(t => !t.IsDeleted && !t.IsCompleted && t.DueDate < DateTime.Now);
        }

        public async Task<IEnumerable<TaskItem>> GetTodayTasksAsync()
        {
            var todayStart = DateTime.Today;
            var todayEnd = todayStart.AddDays(1);

            return await _context.Tasks
                .Where(t => !t.IsDeleted && t.DueDate >= todayStart && t.DueDate < todayEnd)
                .OrderBy(t => t.IsCompleted)
                .ThenBy(t => t.DueDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaskItem>> GetOverdueTasksAsync()
        {
            return await _context.Tasks
                .Where(t => !t.IsDeleted && !t.IsCompleted && t.DueDate < DateTime.Now)
                .OrderBy(t => t.DueDate)
                .ToListAsync();
        }
    }
}
