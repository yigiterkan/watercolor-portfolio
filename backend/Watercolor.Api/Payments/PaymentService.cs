using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Watercolor.Api.Data;
using Watercolor.Api.Hubs;
using Watercolor.Api.Models;
using Watercolor.Api.Services;

namespace Watercolor.Api.Payments;

public enum StartPaymentStatus { Started, NotFound, NotAwaitingPayment, Expired, GatewayError }

public record StartPaymentResult(StartPaymentStatus Status, string? PaymentPageUrl = null, string? Error = null);

public enum CancelStatus { Cancelled, NotFound, NotAllowed, RefundFailed }

public class PaymentService(
    AppDbContext db,
    IPaymentGateway gateway,
    OrderCancellation cancellation,
    IHubContext<AdminHub> adminHub,
    IOptions<PaymentOptions> options,
    ILogger<PaymentService> logger)
{
    private readonly PaymentOptions _options = options.Value;

    public string CallbackUrl => $"{_options.FrontendUrl.TrimEnd('/')}/api/payments/callback";

    public DateTime ExpiresAt(Order order) => order.CreatedAt.AddMinutes(_options.TimeoutMinutes);

    public async Task<StartPaymentResult> StartAsync(int orderId, string userId, string ip, CancellationToken cancellationToken)
    {
        var order = await db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, cancellationToken);

        if (order is null) return new(StartPaymentStatus.NotFound);
        if (order.Status != OrderStatus.AwaitingPayment) return new(StartPaymentStatus.NotAwaitingPayment);
        if (ExpiresAt(order) <= DateTime.UtcNow) return new(StartPaymentStatus.Expired);

        var buyer = new PaymentBuyer(order.UserId, order.User.FullName, order.User.Email!, ip);
        var start = await gateway.StartAsync(order, buyer, CallbackUrl, cancellationToken);
        if (!start.Success) return new(StartPaymentStatus.GatewayError, Error: start.Error);

        order.PaymentToken = start.Token;
        await db.SaveChangesAsync(cancellationToken);
        return new(StartPaymentStatus.Started, start.PaymentPageUrl);
    }

    // Ödeme sayfasından dönüşte ve süre aşımı kontrolünde çağrılır. Birden fazla çağrılması zararsızdır.
    public async Task<int?> CompleteAsync(string token, CancellationToken cancellationToken)
    {
        var check = await gateway.CheckAsync(token, cancellationToken);
        if (check.OrderId is not int orderId) return null;
        if (!check.Paid) return orderId;

        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null || order.PaymentId == check.PaymentId) return orderId;

        if (check.PaidPrice < order.TotalPrice)
        {
            logger.LogError("Ödenen tutar eksik (sipariş {OrderId}: {Paid} < {Total})", orderId, check.PaidPrice, order.TotalPrice);
            return orderId;
        }

        // Yalnızca hâlâ ödeme bekleyen sipariş "ödendi" olarak işaretlenir (aynı anda gelen iki dönüşe karşı).
        var updated = await db.Orders
            .Where(o => o.Id == orderId && o.Status == OrderStatus.AwaitingPayment)
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Status, OrderStatus.Pending)
                .SetProperty(o => o.PaymentId, check.PaymentId)
                .SetProperty(o => o.PaidAt, DateTime.UtcNow), cancellationToken);

        if (updated == 0)
        {
            await db.Entry(order).ReloadAsync(cancellationToken);
            if (order.Status == OrderStatus.Cancelled && order.PaymentId is null)
            {
                // Süresi dolup iptal edilmiş bir sipariş sonradan ödendiyse para iade edilir.
                order.PaymentId = check.PaymentId;
                SetTransactionIds(order, check);
                var refunded = await gateway.RefundAsync(order, "127.0.0.1", cancellationToken);
                await db.SaveChangesAsync(cancellationToken);
                logger.LogWarning("İptal edilmiş sipariş {OrderId} ödendi; iade {Result}", orderId, refunded ? "yapıldı" : "YAPILAMADI");
            }
            return orderId;
        }

        await db.Entry(order).ReloadAsync(cancellationToken);
        SetTransactionIds(order, check);
        await db.SaveChangesAsync(cancellationToken);

        await NotifyAdmins("OrderCreated", order, cancellationToken);
        return orderId;
    }

    public async Task<CancelStatus> CancelAsync(int orderId, string? userId, string ip, OrderStatus[] allowed, CancellationToken cancellationToken)
    {
        var order = await db.Orders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && (userId == null || o.UserId == userId), cancellationToken);
        if (order is null) return CancelStatus.NotFound;

        // Ödeme yapılmış ama dönüş henüz işlenmemiş olabilir; iptalden önce durumu netleştir.
        if (order.Status == OrderStatus.AwaitingPayment && order.PaymentToken is not null)
        {
            await CompleteAsync(order.PaymentToken, cancellationToken);
            await db.Entry(order).ReloadAsync(cancellationToken);
            await db.Entry(order).Collection(o => o.Items).LoadAsync(cancellationToken);
        }

        if (!allowed.Contains(order.Status)) return CancelStatus.NotAllowed;

        var wasPaid = order.PaymentId is not null;
        if (wasPaid && !await gateway.RefundAsync(order, ip, cancellationToken)) return CancelStatus.RefundFailed;

        if (!await cancellation.TryCancelAsync(orderId, allowed))
        {
            logger.LogError("Sipariş {OrderId} iade edildi ama iptal edilemedi (durum bu arada değişti)", orderId);
            return CancelStatus.NotAllowed;
        }

        if (wasPaid && userId is not null) await NotifyAdmins("OrderCancelled", order, cancellationToken);
        return CancelStatus.Cancelled;
    }

    public async Task ExpireStaleAsync(CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-_options.TimeoutMinutes);
        var stale = await db.Orders
            .Where(o => o.Status == OrderStatus.AwaitingPayment && o.CreatedAt <= cutoff)
            .Select(o => new { o.Id, o.PaymentToken })
            .ToListAsync(cancellationToken);

        foreach (var order in stale)
        {
            if (order.PaymentToken is not null) await CompleteAsync(order.PaymentToken, cancellationToken);
            if (await cancellation.TryCancelAsync(order.Id, OrderStatus.AwaitingPayment))
                logger.LogInformation("Ödenmeyen sipariş {OrderId} süre aşımıyla iptal edildi", order.Id);
        }
    }

    private static void SetTransactionIds(Order order, PaymentCheck check)
    {
        foreach (var item in order.Items)
            if (check.ItemTransactionIds?.TryGetValue(item.Id, out var transactionId) == true)
                item.PaymentTransactionId = transactionId;
    }

    // Bildirim gönderilemezse ödeme/iptal yine de geçerli.
    private async Task NotifyAdmins(string method, Order order, CancellationToken cancellationToken)
    {
        try
        {
            var customerName = await db.Users.Where(u => u.Id == order.UserId).Select(u => u.FullName).FirstAsync(cancellationToken);
            var itemCount = await db.OrderItems.Where(i => i.OrderId == order.Id).SumAsync(i => i.Quantity, cancellationToken);
            await adminHub.Clients.All.SendAsync(
                method, new OrderNotification(order.Id, customerName, order.TotalPrice, itemCount), cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Admin bildirimi gönderilemedi (sipariş {OrderId})", order.Id);
        }
    }
}
