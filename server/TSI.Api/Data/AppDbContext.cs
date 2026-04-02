using Microsoft.EntityFrameworkCore;

namespace TSI.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Entity sets added per-screen as screens are built.
    // All complex queries use FromSqlRaw — no LINQ auto-generation.
}
