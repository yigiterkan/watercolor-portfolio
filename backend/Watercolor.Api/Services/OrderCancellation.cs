using Microsoft.EntityFrameworkCore;
using Watercolor.Api.Data;
using Watercolor.Api.Models;

namespace Watercolor.Api.Services;

public class OrderCancellation(AppDbContext db)
{
    // Durum kontrolü ve iptal tek UPDATE'te yapılır; aynı sipariş iki kez iptal edilip stok iki kez iade edilemez.
    public async Task<bool> TryCancelAsync(int orderId, params OrderStatus[] allowedStatuses)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        var cancelled = await db.Orders
            .Where(o => o.Id == orderId && allowedStatuses.Contains(o.Status))
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.Cancelled));
        if (cancelled == 0) return false;

        var items = await db.OrderItems
            .Where(i => i.OrderId == orderId)
            .Select(i => new { i.VariantId, i.Quantity })
            .ToListAsync();

        foreach (var item in items)
        {
            await db.ArtworkVariants
                .Where(v => v.Id == item.VariantId)
                .ExecuteUpdateAsync(s => s.SetProperty(
                    v => v.Stock,
                    v => v.Type == VariantType.Original ? 1 : v.Stock + item.Quantity));
        }

        await transaction.CommitAsync();
        return true;
    }
}
