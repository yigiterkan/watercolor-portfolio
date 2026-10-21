namespace Watercolor.Api.Models;

public class OrderItem
{
    public int Id { get; set; }

    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public int VariantId { get; set; }
    public ArtworkVariant Variant { get; set; } = null!;

    public int Quantity { get; set; }

    // Sipariş anındaki değerler; eser ya da seçenek sonradan değişse de sipariş değişmez.
    public decimal UnitPrice { get; set; }
    public string ArtworkTitle { get; set; } = string.Empty;
    public VariantType VariantType { get; set; }
    public int WidthCm { get; set; }
    public int HeightCm { get; set; }
}
