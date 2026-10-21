using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Watercolor.Api.Auth;
using Watercolor.Api.Data;
using Watercolor.Api.Dtos;
using Watercolor.Api.Models;

namespace Watercolor.Api.Controllers;

[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/admin/orders")]
public class AdminOrdersController(AppDbContext db) : ControllerBase
{
    private const int MaxPageSize = 100;

    [HttpGet]
    public async Task<ActionResult<PagedResult<AdminOrderDto>>> GetAll(
        [FromQuery] OrderStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = db.Orders.AsQueryable();
        if (status is not null) query = query.Where(o => o.Status == status);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ToDto)
            .ToListAsync();

        return new PagedResult<AdminOrderDto>(items, totalCount, page, pageSize);
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<AdminOrderDto>> UpdateStatus(int id, UpdateOrderStatusRequest request)
    {
        var order = await db.Orders.FindAsync(id);
        if (order is null) return NotFound();

        var next = request.Status!.Value;
        if (!order.Status.CanTransitionTo(next))
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: $"Sipariş '{order.Status}' durumundan '{next}' durumuna geçirilemez.");

        order.Status = next;
        await db.SaveChangesAsync();

        return await db.Orders.Where(o => o.Id == id).Select(ToDto).FirstAsync();
    }

    private static readonly Expression<Func<Order, AdminOrderDto>> ToDto = o => new AdminOrderDto(
        o.Id,
        o.Status,
        o.TotalPrice,
        o.ShippingAddress,
        o.CreatedAt,
        o.User.FullName,
        o.User.Email!,
        o.Items
            .OrderBy(i => i.Id)
            .Select(i => new OrderItemDto(
                i.VariantId,
                i.Variant.ArtworkId,
                i.ArtworkTitle,
                i.Variant.Artwork.ImageUrl,
                i.VariantType,
                i.WidthCm,
                i.HeightCm,
                i.Quantity,
                i.UnitPrice))
            .ToList());
}
