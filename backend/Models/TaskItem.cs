using System;
using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class TaskItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MinLength(3)]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Description { get; set; }

        [Required]
        public string Project { get; set; } = "General";

        [Required]
        public string Priority { get; set; } = "medium"; // low, medium, high

        [Required]
        public DateTime DueDate { get; set; }

        public bool IsCompleted { get; set; }

        public DateTime? CompletedAt { get; set; }

        public bool IsDeleted { get; set; }

        public DateTime? DeletedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
