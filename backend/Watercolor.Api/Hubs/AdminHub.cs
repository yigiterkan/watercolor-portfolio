using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Watercolor.Api.Auth;

namespace Watercolor.Api.Hubs;

[Authorize(Roles = Roles.Admin)]
public class AdminHub : Hub
{
    public const string Path = "/hubs/admin";
}

public record OrderNotification(int OrderId, string CustomerName, decimal TotalPrice, int ItemCount);
