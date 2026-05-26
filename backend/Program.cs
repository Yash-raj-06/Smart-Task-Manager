using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Repositories.Interfaces;
using backend.Repositories;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add services to the container
builder.Services.AddControllers();

// Configure SQLite Connection outside the workspace folder to prevent Live Server/file watcher reloads
var dbFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "DB");
Directory.CreateDirectory(dbFolder);
var dbPath = Path.Combine(dbFolder, "tasks.db");
var connectionString = $"Data Source={dbPath}";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// Register Repositories and Services
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<ITaskService, TaskService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
    {
        Title = "Taskify Smart Task Manager API",
        Version = "v1",
        Description = "Production-style RESTful API endpoints for the Taskify dashboard.",
        Contact = new Microsoft.OpenApi.OpenApiContact
        {
            Name = "Taskify Support",
            Email = "support@taskify.com"
        }
    });
});

// Enable CORS for frontend client port communication
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// 2. Configure HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Taskify API v1");
    c.RoutePrefix = "swagger"; // Access Swagger UI at http://localhost:5241/swagger
});

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

// 3. Automatically perform DB migration/creation on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        // Automatically creates database if it does not exist
        context.Database.EnsureCreated();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while creating or migrating the SQLite database.");
    }
}

app.Run();
