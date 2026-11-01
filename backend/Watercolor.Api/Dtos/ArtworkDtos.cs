using System.ComponentModel.DataAnnotations;
using Watercolor.Api.Models;

namespace Watercolor.Api.Dtos;

public record VariantDto(int Id, VariantType Type, int WidthCm, int HeightCm, decimal Price, int Stock);

public record ArtworkDto(
    int Id,
    string Title,
    string? Description,
    string? ImageUrl,
    string? ThumbnailUrl,
    DateTime CreatedAt,
    List<VariantDto> Variants);

public class ArtworkRequest
{
    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Description { get; set; }
}

public class VariantRequest
{
    [Required]
    public VariantType? Type { get; set; }

    [Range(1, 1000)]
    public int WidthCm { get; set; }

    [Range(1, 1000)]
    public int HeightCm { get; set; }

    [Range(0.01, 10_000_000)]
    public decimal Price { get; set; }

    [Range(0, 10_000)]
    public int Stock { get; set; }
}

public enum ArtworkSort
{
    Newest,
    PriceAsc,
    PriceDesc,
}

public class ArtworkQuery
{
    [StringLength(100)]
    public string? Search { get; set; }

    public VariantType? Type { get; set; }

    public bool InStock { get; set; }

    public ArtworkSort Sort { get; set; } = ArtworkSort.Newest;

    // Sepetteki seçeneklerin eserlerini getirmek için.
    public List<int>? VariantIds { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 12;
}
