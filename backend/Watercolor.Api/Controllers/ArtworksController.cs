using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Watercolor.Api.Auth;
using Watercolor.Api.Data;
using Watercolor.Api.Dtos;
using Watercolor.Api.Models;
using Watercolor.Api.Storage;

namespace Watercolor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ArtworksController(AppDbContext db, IImageStorage images) : ControllerBase
{
    private const long MaxImageBytes = 5 * 1024 * 1024;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ArtworkDto>>> GetAll([FromQuery] ArtworkQuery query)
    {
        var artworks = db.Artworks.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            // ILIKE: PostgreSQL'de büyük/küçük harf duyarsız arama. % ve _ joker karakter olmasın diye kaçırılır.
            var pattern = $"%{EscapeLike(query.Search.Trim())}%";
            artworks = artworks.Where(a =>
                EF.Functions.ILike(a.Title, pattern, "\\") ||
                (a.Description != null && EF.Functions.ILike(a.Description, pattern, "\\")));
        }

        if (query.VariantIds is { Count: > 0 })
            artworks = artworks.Where(a => a.Variants.Any(v => query.VariantIds.Contains(v.Id)));

        if (query.Type is not null || query.InStock)
        {
            artworks = artworks.Where(a => a.Variants.Any(v =>
                (query.Type == null || v.Type == query.Type) && (!query.InStock || v.Stock > 0)));
        }

        artworks = query.Sort switch
        {
            ArtworkSort.PriceAsc => artworks
                .OrderBy(a => a.Variants.Any() ? 0 : 1)
                .ThenBy(a => a.Variants.Min(v => (decimal?)v.Price))
                .ThenByDescending(a => a.Id),
            ArtworkSort.PriceDesc => artworks
                .OrderBy(a => a.Variants.Any() ? 0 : 1)
                .ThenByDescending(a => a.Variants.Min(v => (decimal?)v.Price))
                .ThenByDescending(a => a.Id),
            _ => artworks.OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.Id),
        };

        var totalCount = await artworks.CountAsync();
        var items = await artworks
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(ToDto)
            .ToListAsync();

        return new PagedResult<ArtworkDto>(items, totalCount, query.Page, query.PageSize);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ArtworkDto>> GetById(int id)
    {
        var artwork = await db.Artworks.Where(a => a.Id == id).Select(ToDto).FirstOrDefaultAsync();
        if (artwork is null) return NotFound();

        return artwork;
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<ArtworkDto>> Create(ArtworkRequest request)
    {
        var artwork = new Artwork { CreatedAt = DateTime.UtcNow };
        Apply(request, artwork);

        db.Artworks.Add(artwork);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = artwork.Id }, await GetDto(artwork.Id));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, ArtworkRequest request)
    {
        var artwork = await db.Artworks.FindAsync(id);
        if (artwork is null) return NotFound();

        Apply(request, artwork);
        await db.SaveChangesAsync();

        return NoContent();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var artwork = await db.Artworks.FindAsync(id);
        if (artwork is null) return NotFound();

        if (await db.OrderItems.AnyAsync(i => i.Variant.ArtworkId == id))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "Siparişi olan eser silinemez.");

        db.Artworks.Remove(artwork);
        await db.SaveChangesAsync();
        await DeleteImageFiles(artwork.ImageUrl, artwork.ThumbnailUrl);

        return NoContent();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id:int}/image")]
    [RequestSizeLimit(MaxImageBytes + 1024 * 1024)]
    public async Task<ActionResult<ArtworkDto>> UploadImage(int id, IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0 || file.Length > MaxImageBytes)
        {
            ModelState.AddModelError(nameof(file), "Görsel boş olamaz ve en fazla 5 MB olabilir.");
            return ValidationProblem(ModelState);
        }

        await using var stream = file.OpenReadStream();
        if (await ImageFormat.DetectExtensionAsync(stream, cancellationToken) is null)
        {
            ModelState.AddModelError(nameof(file), "Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.");
            return ValidationProblem(ModelState);
        }

        var artwork = await db.Artworks.FindAsync([id], cancellationToken);
        if (artwork is null) return NotFound();

        var processed = ImageProcessor.Process(stream);
        if (processed is null)
        {
            ModelState.AddModelError(nameof(file), "Görsel okunamadı ya da çözünürlüğü çok yüksek.");
            return ValidationProblem(ModelState);
        }

        var (oldImageUrl, oldThumbnailUrl) = (artwork.ImageUrl, artwork.ThumbnailUrl);
        await using (processed.Large)
        await using (processed.Thumbnail)
        {
            artwork.ImageUrl = await images.SaveAsync(processed.Large, ".webp", cancellationToken);
            artwork.ThumbnailUrl = await images.SaveAsync(processed.Thumbnail, ".webp", cancellationToken);
        }
        await db.SaveChangesAsync(cancellationToken);
        await DeleteImageFiles(oldImageUrl, oldThumbnailUrl);

        return await GetDto(id);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}/image")]
    public async Task<IActionResult> DeleteImage(int id)
    {
        var artwork = await db.Artworks.FindAsync(id);
        if (artwork is null) return NotFound();

        if (artwork.ImageUrl is not null || artwork.ThumbnailUrl is not null)
        {
            var (imageUrl, thumbnailUrl) = (artwork.ImageUrl, artwork.ThumbnailUrl);
            artwork.ImageUrl = null;
            artwork.ThumbnailUrl = null;
            await db.SaveChangesAsync();
            await DeleteImageFiles(imageUrl, thumbnailUrl);
        }

        return NoContent();
    }

    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    private async Task DeleteImageFiles(params string?[] urls)
    {
        foreach (var url in urls)
            if (url is not null) await images.DeleteAsync(url);
    }

    private Task<ArtworkDto> GetDto(int id) => db.Artworks.Where(a => a.Id == id).Select(ToDto).FirstAsync();

    private static void Apply(ArtworkRequest request, Artwork artwork)
    {
        artwork.Title = request.Title.Trim();
        artwork.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
    }

    private static readonly Expression<Func<Artwork, ArtworkDto>> ToDto = a => new ArtworkDto(
        a.Id,
        a.Title,
        a.Description,
        a.ImageUrl,
        a.ThumbnailUrl,
        a.CreatedAt,
        a.Variants
            .OrderBy(v => v.Type == VariantType.Original ? 0 : 1)
            .ThenBy(v => v.Price)
            .Select(v => new VariantDto(v.Id, v.Type, v.WidthCm, v.HeightCm, v.Price, v.Stock))
            .ToList());
}
