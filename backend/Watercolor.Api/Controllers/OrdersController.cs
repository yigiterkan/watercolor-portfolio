using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Watercolor.Api.Auth;
using Watercolor.Api.Data;
using Watercolor.Api.Dtos;
using Watercolor.Api.Hubs;
using Watercolor.Api.Models;
using Watercolor.Api.Services;

namespace Watercolor.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class OrdersController(AppDbContext db, OrderCancellation cancellation, IHubContext<AdminHub> adminHub)
    : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<OrderDto>>> GetMine()
    {
        var userId = User.GetUserId();

        return await db.Orders
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(ToDto)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDto>> GetById(int id)
    {
        var userId = User.GetUserId();
        var isAdmin = User.IsInRole(Roles.Admin);

        var order = await db.Orders
            .Where(o => o.Id == id && (isAdmin || o.UserId == userId))
            .Select(ToDto)
            .FirstOrDefaultAsync();

        return order is null ? NotFound() : order;
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderRequest request)
    {
        var variantIds = request.Items.Select(i => i.VariantId).ToList();
        if (variantIds.Distinct().Count() != variantIds.Count)
        {
            ModelState.AddModelError(nameof(request.Items), "Aynı seçenek birden fazla kalemde yer alamaz.");
            return ValidationProblem(ModelState);
        }

        var variants = await db.ArtworkVariants
            .AsNoTracking()
            .Include(v => v.Artwork)
            .Where(v => variantIds.Contains(v.Id))
            .ToDictionaryAsync(v => v.Id);

        if (variants.Count != variantIds.Count)
        {
            ModelState.AddModelError(nameof(request.Items), "Sepetteki eserlerden biri bulunamadı.");
            return ValidationProblem(ModelState);
        }

        await using var transaction = await db.Database.BeginTransactionAsync();

        foreach (var item in request.Items)
        {
            var updated = await db.ArtworkVariants
                .Where(v => v.Id == item.VariantId && v.Stock >= item.Quantity)
                .ExecuteUpdateAsync(s => s.SetProperty(v => v.Stock, v => v.Stock - item.Quantity));

            if (updated == 0)
            {
                await transaction.RollbackAsync();
                var variant = variants[item.VariantId];
                return Problem(
                    statusCode: StatusCodes.Status409Conflict,
                    title: $"'{variant.Artwork.Title}' ({Describe(variant)}) için yeterli stok yok.");
            }
        }

        var order = new Order
        {
            UserId = User.GetUserId()!,
            Status = OrderStatus.Pending,
            ShippingAddress = request.ShippingAddress.Trim(),
            CreatedAt = DateTime.UtcNow,
            Items = request.Items
                .Select(i =>
                {
                    var variant = variants[i.VariantId];
                    return new OrderItem
                    {
                        VariantId = variant.Id,
                        Quantity = i.Quantity,
                        UnitPrice = variant.Price,
                        ArtworkTitle = variant.Artwork.Title,
                        VariantType = variant.Type,
                        WidthCm = variant.WidthCm,
                        HeightCm = variant.HeightCm,
                    };
                })
                .ToList(),
        };
        order.TotalPrice = order.Items.Sum(i => i.UnitPrice * i.Quantity);

        db.Orders.Add(order);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        await NotifyAdmins("OrderCreated", order);

        var dto = await db.Orders.Where(o => o.Id == order.Id).Select(ToDto).FirstAsync();
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, dto);
    }

    // Müşteri yalnızca henüz onaylanmamış siparişini iptal edebilir.
    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<OrderDto>> Cancel(int id)
    {
        var userId = User.GetUserId();
        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order is null) return NotFound();

        if (!await cancellation.TryCancelAsync(id, OrderStatus.Pending))
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Bu sipariş artık iptal edilemez. Onaylanmış siparişler için bizimle iletişime geçin.");

        await NotifyAdmins("OrderCancelled", order);

        return await db.Orders.Where(o => o.Id == id).Select(ToDto).FirstAsync();
    }

    // Bildirim gönderilemezse sipariş yine de geçerli; hata kullanıcıya yansımasın.
    private async Task NotifyAdmins(string method, Order order)
    {
        try
        {
            var itemCount = await db.OrderItems.Where(i => i.OrderId == order.Id).SumAsync(i => i.Quantity);
            var notification = new OrderNotification(order.Id, User.Identity?.Name ?? "", order.TotalPrice, itemCount);
            await adminHub.Clients.All.SendAsync(method, notification);
        }
        catch (Exception ex)
        {
            HttpContext.RequestServices.GetRequiredService<ILogger<OrdersController>>()
                .LogWarning(ex, "Admin bildirimi gönderilemedi (sipariş {OrderId})", order.Id);
        }
    }

    private static string Describe(ArtworkVariant v) =>
        v.Type == VariantType.Original ? "orijinal" : $"{v.WidthCm} × {v.HeightCm} cm baskı";

    private static readonly Expression<Func<Order, OrderDto>> ToDto = o => new OrderDto(
        o.Id,
        o.Status,
        o.TotalPrice,
        o.ShippingAddress,
        o.CreatedAt,
        o.Items
            .OrderBy(i => i.Id)
            .Select(i => new OrderItemDto(
                i.VariantId,
                i.Variant.ArtworkId,
                i.ArtworkTitle,
                i.Variant.Artwork.ThumbnailUrl ?? i.Variant.Artwork.ImageUrl,
                i.VariantType,
                i.WidthCm,
                i.HeightCm,
                i.Quantity,
                i.UnitPrice))
            .ToList());
}
