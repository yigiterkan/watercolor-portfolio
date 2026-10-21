using Microsoft.AspNetCore.Mvc;
using Watercolor.Api.Data;

namespace Watercolor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    { 
        var databaseConnected = await db.Database.CanConnectAsync();
        return Ok(new { status = "ok", databaseConnected });
    }
}
