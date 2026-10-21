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
[Authorize]
[Route("api/[controller]")]
public class OrdersController(AppDbContext db) : ControllerBase
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

        var dto = await db.Orders.Where(o => o.Id == order.Id).Select(ToDto).FirstAsync();
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, dto);
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
                i.Variant.Artwork.ImageUrl,
                i.VariantType,
                i.WidthCm,
                i.HeightCm,
                i.Quantity,
                i.UnitPrice))
            .ToList());
}
