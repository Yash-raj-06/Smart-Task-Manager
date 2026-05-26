using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs;

namespace backend.Services
{
    public interface ITaskService
    {
        Task<TaskDto?> GetTaskByIdAsync(int id);
        Task<(IEnumerable<TaskDto> Tasks, int TotalCount)> GetTasksPagedAsync(string? search, string? priority, string? status, int skip, int take);
        Task<TaskDto> CreateTaskAsync(CreateTaskDto createTaskDto);
        Task<TaskDto?> UpdateTaskAsync(int id, UpdateTaskDto updateTaskDto);
        Task<bool> SoftDeleteTaskAsync(int id);
        Task<bool> RestoreTaskAsync(int id);
        Task<bool> PermanentDeleteTaskAsync(int id);
        Task<IEnumerable<TaskDto>> GetTrashTasksAsync();
        Task<object> GetDashboardDataAsync();
    }
}
