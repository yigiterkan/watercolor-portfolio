namespace Watercolor.Api.Models;

public enum OrderStatus
{
    Pending,
    Confirmed,
    Shipped,
    Delivered,
}

public static class OrderStatusExtensions
{
    public static bool CanTransitionTo(this OrderStatus current, OrderStatus next) =>
        (int)next == (int)current + 1;
}
