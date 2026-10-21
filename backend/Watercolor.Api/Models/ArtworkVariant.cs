namespace Watercolor.Api.Models;

public class ArtworkVariant
{
    public int Id { get; set; }

    public int ArtworkId { get; set; }
    public Artwork Artwork { get; set; } = null!;

    public VariantType Type { get; set; }
    public int WidthCm { get; set; }
    public int HeightCm { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
}
