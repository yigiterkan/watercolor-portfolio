using Microsoft.AspNetCore.Identity;

namespace Watercolor.Api.Models;

public class AppUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;

    public List<Order> Orders { get; set; } = [];
}
