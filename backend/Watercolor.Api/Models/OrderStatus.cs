namespace Watercolor.Api.Models;

public enum OrderStatus
{
    Pending,
    Confirmed,
    Shipped,
    Delivered,
    Cancelled,
}

public static class OrderStatusExtensions
{
    // İleri yönde yalnızca sıradaki adıma geçilir; iptal yalnızca kargoya verilmeden önce mümkündür.
    public static bool CanTransitionTo(this OrderStatus current, OrderStatus next) =>
        next == OrderStatus.Cancelled
            ? current is OrderStatus.Pending or OrderStatus.Confirmed
            : current != OrderStatus.Cancelled && (int)next == (int)current + 1;
}
