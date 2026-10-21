using System.ComponentModel.DataAnnotations;
using Watercolor.Api.Models;

namespace Watercolor.Api.Dtos;

public record OrderItemDto(
    int VariantId,
    int ArtworkId,
    string Title,
    string? ImageUrl,
    VariantType VariantType,
    int WidthCm,
    int HeightCm,
    int Quantity,
    decimal UnitPrice);

public record OrderDto(
    int Id,
    OrderStatus Status,
    decimal TotalPrice,
    string ShippingAddress,
    DateTime CreatedAt,
    List<OrderItemDto> Items);

public class OrderItemRequest
{
    public int VariantId { get; set; }

    [Range(1, 100)]
    public int Quantity { get; set; }
}

public class CreateOrderRequest
{
    [Required, MinLength(1)]
    public List<OrderItemRequest> Items { get; set; } = [];

    [Required, StringLength(500)]
    public string ShippingAddress { get; set; } = string.Empty;
}

public record AdminOrderDto(
    int Id,
    OrderStatus Status,
    decimal TotalPrice,
    string ShippingAddress,
    DateTime CreatedAt,
    string CustomerName,
    string CustomerEmail,
    List<OrderItemDto> Items);

public class UpdateOrderStatusRequest
{
    [Required]
    public OrderStatus? Status { get; set; }
}
