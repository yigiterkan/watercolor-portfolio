using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Watercolor.Api.Auth;
using Watercolor.Api.Data;
using Watercolor.Api.Dtos;
using Watercolor.Api.Models;

namespace Watercolor.Api.Controllers;

[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/artworks/{artworkId:int}/variants")]
public class ArtworkVariantsController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<VariantDto>> Create(int artworkId, VariantRequest request)
    {
        if (!await db.Artworks.AnyAsync(a => a.Id == artworkId)) return NotFound();

        var variant = new ArtworkVariant { ArtworkId = artworkId };
        Apply(request, variant);

        var problem = await Validate(variant);
        if (problem is not null) return problem;

        db.ArtworkVariants.Add(variant);
        await db.SaveChangesAsync();

        return CreatedAtAction(
            nameof(ArtworksController.GetById),
            "Artworks",
            new { id = artworkId },
            ToDto(variant));
    }

    [HttpPut("{variantId:int}")]
    public async Task<ActionResult<VariantDto>> Update(int artworkId, int variantId, VariantRequest request)
    {
        var variant = await db.ArtworkVariants.FirstOrDefaultAsync(v => v.Id == variantId && v.ArtworkId == artworkId);
        if (variant is null) return NotFound();

        Apply(request, variant);

        var problem = await Validate(variant);
        if (problem is not null) return problem;

        await db.SaveChangesAsync();
        return ToDto(variant);
    }

    [HttpDelete("{variantId:int}")]
    public async Task<IActionResult> Delete(int artworkId, int variantId)
    {
        var variant = await db.ArtworkVariants.FirstOrDefaultAsync(v => v.Id == variantId && v.ArtworkId == artworkId);
        if (variant is null) return NotFound();

        if (await db.OrderItems.AnyAsync(i => i.VariantId == variantId))
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Siparişi olan seçenek silinemez. Satışı durdurmak için stoğunu 0 yapabilirsiniz.");

        db.ArtworkVariants.Remove(variant);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private async Task<ActionResult?> Validate(ArtworkVariant variant)
    {
        if (variant.Type == VariantType.Original && variant.Stock > 1)
        {
            ModelState.AddModelError(nameof(variant.Stock), "Orijinal eserin stoğu 0 ya da 1 olabilir.");
            return ValidationProblem(ModelState);
        }

        var siblings = db.ArtworkVariants.Where(v => v.ArtworkId == variant.ArtworkId && v.Id != variant.Id);

        if (variant.Type == VariantType.Original && await siblings.AnyAsync(v => v.Type == VariantType.Original))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "Bu eserin zaten bir orijinal seçeneği var.");

        if (await siblings.AnyAsync(v =>
                v.Type == variant.Type && v.WidthCm == variant.WidthCm && v.HeightCm == variant.HeightCm))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "Bu türde ve ölçüde bir seçenek zaten var.");

        return null;
    }

    private static void Apply(VariantRequest request, ArtworkVariant variant)
    {
        variant.Type = request.Type!.Value;
        variant.WidthCm = request.WidthCm;
        variant.HeightCm = request.HeightCm;
        variant.Price = request.Price;
        variant.Stock = request.Stock;
    }

    private static VariantDto ToDto(ArtworkVariant v) => new(v.Id, v.Type, v.WidthCm, v.HeightCm, v.Price, v.Stock);
}
