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
    public async Task<ActionResult<List<ArtworkDto>>> GetAll([FromQuery] ArtworkQuery query)
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

        if (query.Type is not null || query.InStock)
        {
            artworks = artworks.Where(a => a.Variants.Any(v =>
                (query.Type == null || v.Type == query.Type) && (!query.InStock || v.Stock > 0)));
        }

        artworks = query.Sort switch
        {
            ArtworkSort.PriceAsc => artworks
                .OrderBy(a => a.Variants.Any() ? 0 : 1)
                .ThenBy(a => a.Variants.Min(v => (decimal?)v.Price)),
            ArtworkSort.PriceDesc => artworks
                .OrderBy(a => a.Variants.Any() ? 0 : 1)
                .ThenByDescending(a => a.Variants.Min(v => (decimal?)v.Price)),
            _ => artworks.OrderByDescending(a => a.CreatedAt),
        };

        return await artworks.Select(ToDto).ToListAsync();
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
        if (artwork.ImageUrl is not null) await images.DeleteAsync(artwork.ImageUrl);

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
        var extension = await ImageFormat.DetectExtensionAsync(stream, cancellationToken);
        if (extension is null)
        {
            ModelState.AddModelError(nameof(file), "Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.");
            return ValidationProblem(ModelState);
        }

        var artwork = await db.Artworks.FindAsync([id], cancellationToken);
        if (artwork is null) return NotFound();

        var oldImageUrl = artwork.ImageUrl;
        artwork.ImageUrl = await images.SaveAsync(stream, extension, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        if (oldImageUrl is not null) await images.DeleteAsync(oldImageUrl);

        return await GetDto(id);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}/image")]
    public async Task<IActionResult> DeleteImage(int id)
    {
        var artwork = await db.Artworks.FindAsync(id);
        if (artwork is null) return NotFound();

        if (artwork.ImageUrl is not null)
        {
            var imageUrl = artwork.ImageUrl;
            artwork.ImageUrl = null;
            await db.SaveChangesAsync();
            await images.DeleteAsync(imageUrl);
        }

        return NoContent();
    }

    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

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
        a.CreatedAt,
        a.Variants
            .OrderBy(v => v.Type == VariantType.Original ? 0 : 1)
            .ThenBy(v => v.Price)
            .Select(v => new VariantDto(v.Id, v.Type, v.WidthCm, v.HeightCm, v.Price, v.Stock))
            .ToList());
}
