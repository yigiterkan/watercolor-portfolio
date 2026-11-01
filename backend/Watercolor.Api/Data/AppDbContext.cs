using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Watercolor.Api.Models;

namespace Watercolor.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Artwork> Artworks => Set<Artwork>();
    public DbSet<ArtworkVariant> ArtworkVariants => Set<ArtworkVariant>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>().Property(u => u.FullName).HasMaxLength(100);

        modelBuilder.Entity<Artwork>(artwork =>
        {
            artwork.Property(a => a.Title).HasMaxLength(200);
            artwork.Property(a => a.Description).HasMaxLength(2000);
            artwork.Property(a => a.ImageUrl).HasMaxLength(500);
            artwork.Property(a => a.ThumbnailUrl).HasMaxLength(500);
        });

        modelBuilder.Entity<ArtworkVariant>(variant =>
        {
            variant.Property(v => v.Type).HasConversion<string>().HasMaxLength(20);
            variant.Property(v => v.Price).HasPrecision(10, 2);

            variant.HasOne(v => v.Artwork)
                .WithMany(a => a.Variants)
                .HasForeignKey(v => v.ArtworkId)
                .OnDelete(DeleteBehavior.Cascade);

            variant.HasIndex(v => new { v.ArtworkId, v.Type, v.WidthCm, v.HeightCm }).IsUnique();

            variant.HasIndex(v => v.ArtworkId, "IX_ArtworkVariants_OneOriginalPerArtwork")
                .IsUnique()
                .HasFilter("\"Type\" = 'Original'");

            variant.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ArtworkVariants_StockNonNegative", "\"Stock\" >= 0");
                t.HasCheckConstraint("CK_ArtworkVariants_OriginalStock", "\"Type\" <> 'Original' OR \"Stock\" <= 1");
            });
        });

        modelBuilder.Entity<Order>(order =>
        {
            order.Property(o => o.Status).HasConversion<string>().HasMaxLength(20);
            order.Property(o => o.TotalPrice).HasPrecision(12, 2);
            order.Property(o => o.ShippingAddress).HasMaxLength(500);

            order.HasOne(o => o.User)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<OrderItem>(item =>
        {
            item.Property(i => i.UnitPrice).HasPrecision(10, 2);
            item.Property(i => i.ArtworkTitle).HasMaxLength(200);
            item.Property(i => i.VariantType).HasConversion<string>().HasMaxLength(20);

            item.HasOne(i => i.Order)
                .WithMany(o => o.Items)
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            item.HasOne(i => i.Variant)
                .WithMany()
                .HasForeignKey(i => i.VariantId)
                .OnDelete(DeleteBehavior.Restrict);

            item.HasIndex(i => new { i.OrderId, i.VariantId }).IsUnique();
        });
    }
}
