using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Watercolor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddArtworkVariants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Elle düzenlendi: otomatik üretilen sürüm fiyat/ölçü/stok kolonlarını veriyi taşımadan siliyordu.
            migrationBuilder.CreateTable(
                name: "ArtworkVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ArtworkId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WidthCm = table.Column<int>(type: "integer", nullable: false),
                    HeightCm = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    Stock = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArtworkVariants", x => x.Id);
                    table.CheckConstraint("CK_ArtworkVariants_OriginalStock", "\"Type\" <> 'Original' OR \"Stock\" <= 1");
                    table.CheckConstraint("CK_ArtworkVariants_StockNonNegative", "\"Stock\" >= 0");
                    table.ForeignKey(
                        name: "FK_ArtworkVariants_Artworks_ArtworkId",
                        column: x => x.ArtworkId,
                        principalTable: "Artworks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Her mevcut eser için bir "Original" seçeneği; orijinal tek adet olabileceği için stok en fazla 1.
            migrationBuilder.Sql("""
                INSERT INTO "ArtworkVariants" ("ArtworkId", "Type", "WidthCm", "HeightCm", "Price", "Stock")
                SELECT "Id", 'Original', "WidthCm", "HeightCm", "Price", LEAST("Stock", 1)
                FROM "Artworks";
                """);

            migrationBuilder.AddColumn<int>(
                name: "VariantId",
                table: "OrderItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArtworkTitle",
                table: "OrderItems",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VariantType",
                table: "OrderItems",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "WidthCm",
                table: "OrderItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HeightCm",
                table: "OrderItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("""
                UPDATE "OrderItems" AS i
                SET "VariantId" = v."Id",
                    "ArtworkTitle" = a."Title",
                    "VariantType" = v."Type",
                    "WidthCm" = v."WidthCm",
                    "HeightCm" = v."HeightCm"
                FROM "ArtworkVariants" AS v
                JOIN "Artworks" AS a ON a."Id" = v."ArtworkId"
                WHERE v."ArtworkId" = i."ArtworkId" AND v."Type" = 'Original';
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_Artworks_ArtworkId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_ArtworkId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_OrderId_ArtworkId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ArtworkId",
                table: "OrderItems");

            migrationBuilder.AlterColumn<int>(
                name: "VariantId",
                table: "OrderItems",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.DropColumn(name: "Price", table: "Artworks");
            migrationBuilder.DropColumn(name: "Stock", table: "Artworks");
            migrationBuilder.DropColumn(name: "WidthCm", table: "Artworks");
            migrationBuilder.DropColumn(name: "HeightCm", table: "Artworks");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId_VariantId",
                table: "OrderItems",
                columns: new[] { "OrderId", "VariantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_VariantId",
                table: "OrderItems",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ArtworkVariants_ArtworkId_Type_WidthCm_HeightCm",
                table: "ArtworkVariants",
                columns: new[] { "ArtworkId", "Type", "WidthCm", "HeightCm" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ArtworkVariants_OneOriginalPerArtwork",
                table: "ArtworkVariants",
                column: "ArtworkId",
                unique: true,
                filter: "\"Type\" = 'Original'");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_ArtworkVariants_VariantId",
                table: "OrderItems",
                column: "VariantId",
                principalTable: "ArtworkVariants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Geri alırken her eser için orijinal seçeneğin (yoksa en ucuz seçeneğin) bilgileri esere döner.
            // Birden fazla seçeneği olan eserlerde diğer seçenekler kaybolur.
            migrationBuilder.AddColumn<decimal>(
                name: "Price", table: "Artworks", type: "numeric(10,2)", precision: 10, scale: 2, nullable: false, defaultValue: 0m);
            migrationBuilder.AddColumn<int>(
                name: "Stock", table: "Artworks", type: "integer", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(
                name: "WidthCm", table: "Artworks", type: "integer", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(
                name: "HeightCm", table: "Artworks", type: "integer", nullable: false, defaultValue: 0);

            migrationBuilder.Sql("""
                UPDATE "Artworks" AS a
                SET "Price" = v."Price", "Stock" = v."Stock", "WidthCm" = v."WidthCm", "HeightCm" = v."HeightCm"
                FROM (
                    SELECT DISTINCT ON ("ArtworkId") *
                    FROM "ArtworkVariants"
                    ORDER BY "ArtworkId", ("Type" = 'Original') DESC, "Price"
                ) AS v
                WHERE v."ArtworkId" = a."Id";
                """);

            migrationBuilder.AddColumn<int>(
                name: "ArtworkId", table: "OrderItems", type: "integer", nullable: true);

            migrationBuilder.Sql("""
                UPDATE "OrderItems" AS i
                SET "ArtworkId" = v."ArtworkId"
                FROM "ArtworkVariants" AS v
                WHERE v."Id" = i."VariantId";
                """);

            migrationBuilder.DropForeignKey(name: "FK_OrderItems_ArtworkVariants_VariantId", table: "OrderItems");
            migrationBuilder.DropIndex(name: "IX_OrderItems_OrderId_VariantId", table: "OrderItems");
            migrationBuilder.DropIndex(name: "IX_OrderItems_VariantId", table: "OrderItems");
            migrationBuilder.DropColumn(name: "VariantId", table: "OrderItems");
            migrationBuilder.DropColumn(name: "ArtworkTitle", table: "OrderItems");
            migrationBuilder.DropColumn(name: "VariantType", table: "OrderItems");
            migrationBuilder.DropColumn(name: "WidthCm", table: "OrderItems");
            migrationBuilder.DropColumn(name: "HeightCm", table: "OrderItems");

            migrationBuilder.DropTable(name: "ArtworkVariants");

            migrationBuilder.AlterColumn<int>(
                name: "ArtworkId", table: "OrderItems", type: "integer", nullable: false,
                oldClrType: typeof(int), oldType: "integer", oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_ArtworkId", table: "OrderItems", column: "ArtworkId");
            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId_ArtworkId", table: "OrderItems",
                columns: new[] { "OrderId", "ArtworkId" }, unique: true);
            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_Artworks_ArtworkId", table: "OrderItems", column: "ArtworkId",
                principalTable: "Artworks", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
        }
    }
}
