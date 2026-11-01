using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Watercolor.Api.Auth;
using Watercolor.Api.Data;
using Watercolor.Api.Dtos;
using Watercolor.Api.Models;
using Watercolor.Api.Payments;

namespace Watercolor.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class OrdersController(AppDbContext db, PaymentService payments) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<OrderDto>>> GetMine()
    {
        var userId = User.GetUserId();

        var orders = await db.Orders
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(ToDto)
            .ToListAsync();

        return orders.Select(WithExpiry).ToList();
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

        return order is null ? NotFound() : WithExpiry(order);
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
            Status = OrderStatus.AwaitingPayment,
            ShippingAddress = request.ShippingAddress.Trim(),
            ShippingCity = request.ShippingCity.Trim(),
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

        var dto = await db.Orders.Where(o => o.Id == order.Id).Select(ToDto).FirstAsync();
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, WithExpiry(dto));
    }

    // Ödeme sayfasının adresini döner; frontend kullanıcıyı oraya yönlendirir.
    [HttpPost("{id:int}/payment")]
    public async Task<ActionResult<StartPaymentResponse>> StartPayment(int id, CancellationToken cancellationToken)
    {
        var result = await payments.StartAsync(id, User.GetUserId()!, ClientIp, cancellationToken);
        return result.Status switch
        {
            StartPaymentStatus.Started => new StartPaymentResponse(result.PaymentPageUrl!),
            StartPaymentStatus.NotFound => NotFound(),
            StartPaymentStatus.NotAwaitingPayment => Problem(statusCode: StatusCodes.Status409Conflict, title: "Bu siparişin ödemesi zaten alınmış ya da sipariş iptal edilmiş."),
            StartPaymentStatus.Expired => Problem(statusCode: StatusCodes.Status409Conflict, title: "Ödeme süresi doldu; sipariş kısa süre içinde iptal edilecek."),
            _ => Problem(statusCode: StatusCodes.Status502BadGateway, title: "Ödeme sayfası açılamadı. Lütfen biraz sonra tekrar deneyin."),
        };
    }

    // Müşteri ödenmemiş ya da henüz onaylanmamış siparişini iptal edebilir; ödenmişse para iade edilir.
    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<OrderDto>> Cancel(int id, CancellationToken cancellationToken)
    {
        var result = await payments.CancelAsync(
            id, User.GetUserId()!, ClientIp, [OrderStatus.AwaitingPayment, OrderStatus.Pending], cancellationToken);

        return result switch
        {
            CancelStatus.Cancelled => WithExpiry(await db.Orders.Where(o => o.Id == id).Select(ToDto).FirstAsync(cancellationToken)),
            CancelStatus.NotFound => NotFound(),
            CancelStatus.RefundFailed => Problem(statusCode: StatusCodes.Status502BadGateway, title: "İade yapılamadığı için sipariş iptal edilemedi. Lütfen bizimle iletişime geçin."),
            _ => Problem(statusCode: StatusCodes.Status409Conflict, title: "Bu sipariş artık iptal edilemez. Onaylanmış siparişler için bizimle iletişime geçin."),
        };
    }

    private string ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

    private OrderDto WithExpiry(OrderDto order) =>
        order.Status == OrderStatus.AwaitingPayment
            ? order with { PaymentExpiresAt = payments.ExpiresAt(new Order { CreatedAt = order.CreatedAt }) }
            : order;

    private static string Describe(ArtworkVariant v) =>
        v.Type == VariantType.Original ? "orijinal" : $"{v.WidthCm} × {v.HeightCm} cm baskı";

    private static readonly Expression<Func<Order, OrderDto>> ToDto = o => new OrderDto(
        o.Id,
        o.Status,
        o.TotalPrice,
        o.ShippingAddress,
        o.ShippingCity,
        o.CreatedAt,
        null,
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
