namespace Watercolor.Api.Models;

public class Order
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;

    public OrderStatus Status { get; set; }
    public decimal TotalPrice { get; set; }
    public string ShippingAddress { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public List<OrderItem> Items { get; set; } = [];
}
