using System;

namespace backend.DTOs
{
    public class TaskDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Project { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Dynamic Overdue evaluation calculated on backend using DueDate and IsCompleted
        public bool IsOverdue => !IsCompleted && DueDate < DateTime.Now;
    }
}
