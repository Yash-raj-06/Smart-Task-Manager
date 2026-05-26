using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<TaskItem> Tasks => Set<TaskItem>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Fluent configurations and indexing
            modelBuilder.Entity<TaskItem>()
                .HasIndex(t => t.IsCompleted)
                .HasDatabaseName("IX_Tasks_IsCompleted");

            modelBuilder.Entity<TaskItem>()
                .HasIndex(t => t.IsDeleted)
                .HasDatabaseName("IX_Tasks_IsDeleted");

            modelBuilder.Entity<TaskItem>()
                .HasIndex(t => t.DueDate)
                .HasDatabaseName("IX_Tasks_DueDate");
        }
    }
}
