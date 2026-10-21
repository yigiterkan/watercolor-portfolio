using Microsoft.AspNetCore.Identity;
using Watercolor.Api.Auth;
using Watercolor.Api.Models;

namespace Watercolor.Api.Data;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var config = services.GetRequiredService<IConfiguration>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(IdentitySeeder));

        foreach (var role in new[] { Roles.User, Roles.Admin })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        var email = config["AdminUser:Email"];
        var password = config["AdminUser:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("AdminUser:Email / AdminUser:Password tanımlı değil, admin kullanıcısı oluşturulmadı.");
            return;
        }

        if (await userManager.FindByEmailAsync(email) is not null) return;

        var admin = new AppUser { UserName = email, Email = email, FullName = "Admin" };
        var result = await userManager.CreateAsync(admin, password);
        if (!result.Succeeded)
        {
            logger.LogError("Admin kullanıcısı oluşturulamadı: {Errors}",
                string.Join("; ", result.Errors.Select(e => e.Description)));
            return;
        }

        await userManager.AddToRoleAsync(admin, Roles.Admin);
    }
}
