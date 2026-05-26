using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using backend.DTOs;
using backend.Services;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {

        private readonly ITaskService _taskService;

        public TasksController(ITaskService taskService)
        {
            _taskService = taskService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? priority,
            [FromQuery] string? status,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 5)
        {
            try
            {
                var (tasks, totalCount) = await _taskService.GetTasksPagedAsync(search, priority, status, skip, take);
                return Ok(new
                {
                    success = true,
                    message = "Tasks retrieved successfully",
                    data = new { tasks, totalCount }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to retrieve tasks: {ex.Message}" });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var task = await _taskService.GetTaskByIdAsync(id);
                if (task == null)
                {
                    return NotFound(new { success = false, message = "Task not found" });
                }

                return Ok(new
                {
                    success = true,
                    message = "Task retrieved successfully",
                    data = task
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to retrieve task: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTaskDto createTaskDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid task fields", data = ModelState });
            }

            try
            {
                var created = await _taskService.CreateTaskAsync(createTaskDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, new
                {
                    success = true,
                    message = "Task created successfully",
                    data = created
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTaskDto updateTaskDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid updates", data = ModelState });
            }

            try
            {
                var updated = await _taskService.UpdateTaskAsync(id, updateTaskDto);
                if (updated == null)
                {
                    return NotFound(new { success = false, message = "Task not found" });
                }

                if (updated.Title == "NO_CHANGES_DETECTED")
                {
                    // Restore original title
                    updated.Title = updateTaskDto.Title.Trim();
                    return Ok(new
                    {
                        success = true,
                        message = "No changes detected",
                        data = updated
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Task updated successfully",
                    data = updated
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> SoftDelete(int id)
        {
            try
            {
                var result = await _taskService.SoftDeleteTaskAsync(id);
                if (!result)
                {
                    return NotFound(new { success = false, message = "Task not found or already deleted" });
                }

                return Ok(new
                {
                    success = true,
                    message = "Task moved to trash successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to soft delete task: {ex.Message}" });
            }
        }

        [HttpPut("{id:int}/restore")]
        public async Task<IActionResult> Restore(int id)
        {
            try
            {
                var result = await _taskService.RestoreTaskAsync(id);
                if (!result)
                {
                    return NotFound(new { success = false, message = "Task not found in trash" });
                }

                return Ok(new
                {
                    success = true,
                    message = "Task restored successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to restore task: {ex.Message}" });
            }
        }

        [HttpDelete("{id:int}/permanent")]
        public async Task<IActionResult> PermanentDelete(int id)
        {
            try
            {
                var result = await _taskService.PermanentDeleteTaskAsync(id);
                if (!result)
                {
                    return NotFound(new { success = false, message = "Task not found in trash" });
                }

                return Ok(new
                {
                    success = true,
                    message = "Task permanently deleted"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to permanently delete task: {ex.Message}" });
            }
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var dashboardData = await _taskService.GetDashboardDataAsync();
                return Ok(new
                {
                    success = true,
                    message = "Dashboard summary loaded",
                    data = dashboardData
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to load dashboard data: {ex.Message}" });
            }
        }

        [HttpGet("trash")]
        public async Task<IActionResult> GetTrash()
        {
            try
            {
                var trashItems = await _taskService.GetTrashTasksAsync();
                return Ok(new
                {
                    success = true,
                    message = "Trash drawer items loaded",
                    data = trashItems
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to load trash: {ex.Message}" });
            }
        }
    }
}
