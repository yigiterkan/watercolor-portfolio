namespace Watercolor.Api.Models;

public enum OrderStatus
{
    AwaitingPayment,
    Pending,
    Confirmed,
    Shipped,
    Delivered,
    Cancelled,
}

public static class OrderStatusExtensions
{
    private static readonly OrderStatus[] Flow =
        [OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.Shipped, OrderStatus.Delivered];

    // Admin siparişi yalnızca sıradaki adıma ilerletebilir; ödeme bekleyen sipariş ödeme ile ilerler.
    // İptal kargoya verilmeden önce mümkündür.
    public static bool CanTransitionTo(this OrderStatus current, OrderStatus next)
    {
        if (next == OrderStatus.Cancelled)
            return current is OrderStatus.AwaitingPayment or OrderStatus.Pending or OrderStatus.Confirmed;

        var index = Array.IndexOf(Flow, current);
        return index >= 0 && index + 1 < Flow.Length && Flow[index + 1] == next;
    }
}
