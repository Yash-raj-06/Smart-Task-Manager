using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using backend.Models;

namespace backend.Repositories.Interfaces
{
    public interface ITaskRepository
    {
        Task<TaskItem?> GetByIdAsync(int id);
        Task<IEnumerable<TaskItem>> GetAllAsync(string? search, string? priority, string? status, int skip, int take);
        Task<int> GetCountAsync(string? search, string? priority, string? status);
        Task<TaskItem> AddAsync(TaskItem task);
        Task UpdateAsync(TaskItem task);
        Task DeleteAsync(TaskItem task);
        Task<IEnumerable<TaskItem>> GetTrashAsync();
        Task<int> CleanupExpiredTrashAsync(int daysLimit);
        
        // Dashboard metric queries
        Task<int> GetPendingCountAsync();
        Task<int> GetCompletedCountAsync();
        Task<int> GetOverdueCountAsync();
        
        // Dashboard schedule feeds
        Task<IEnumerable<TaskItem>> GetTodayTasksAsync();
        Task<IEnumerable<TaskItem>> GetOverdueTasksAsync();
    }
}
