namespace Watercolor.Api.Models;

public class Artwork
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<ArtworkVariant> Variants { get; set; } = [];
}
