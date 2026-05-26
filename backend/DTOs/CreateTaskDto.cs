using System;
using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class CreateTaskDto
    {
        [Required(ErrorMessage = "Task Title is required.")]
        [MinLength(3, ErrorMessage = "Title must be at least 3 characters.")]
        [MaxLength(100, ErrorMessage = "Title cannot exceed 100 characters.")]
        [RegularExpression(@"^(?!\s*$).+", ErrorMessage = "Title cannot consist only of spaces.")]
        public string Title { get; set; } = string.Empty;

        [MaxLength(300, ErrorMessage = "Description cannot exceed 300 characters.")]
        public string? Description { get; set; }

        public string Project { get; set; } = "General";

        [Required(ErrorMessage = "Priority is required.")]
        [RegularExpression("^(low|medium|high)$", ErrorMessage = "Priority must be either 'low', 'medium', or 'high'.")]
        public string Priority { get; set; } = "medium";

        [Required(ErrorMessage = "Due Date is required.")]
        public DateTime DueDate { get; set; }

        public string? DueTime { get; set; } // Optional time string passed from UI
    }
}
