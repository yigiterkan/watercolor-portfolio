using SkiaSharp;

namespace Watercolor.Api.Storage;

public record ProcessedImage(MemoryStream Large, MemoryStream Thumbnail);

public static class ImageProcessor
{
    public const int LargeSize = 1600;
    public const int ThumbnailSize = 640;
    private const int WebpQuality = 82;

    // Sıkıştırılmış hâli küçük ama açıldığında çok büyük olan dosyalara karşı.
    private const long MaxPixels = 40_000_000;

    // Geçersiz ya da desteklenmeyen dosyada null döner. Yeniden kodlama EXIF (konum vb.) bilgilerini de atar.
    public static ProcessedImage? Process(Stream input)
    {
        using var codec = SKCodec.Create(input);
        if (codec is null || (long)codec.Info.Width * codec.Info.Height > MaxPixels) return null;

        using var decoded = SKBitmap.Decode(codec);
        if (decoded is null) return null;

        using var oriented = ApplyOrientation(decoded, codec.EncodedOrigin);
        return new ProcessedImage(Encode(oriented, LargeSize), Encode(oriented, ThumbnailSize));
    }

    private static MemoryStream Encode(SKBitmap source, int maxSize)
    {
        var scale = Math.Min(1.0, (double)maxSize / Math.Max(source.Width, source.Height));
        var info = new SKImageInfo(
            Math.Max(1, (int)Math.Round(source.Width * scale)),
            Math.Max(1, (int)Math.Round(source.Height * scale)));

        using var resized = scale < 1
            ? source.Resize(info, new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear))
            : source.Copy();
        using var image = SKImage.FromBitmap(resized);
        using var data = image.Encode(SKEncodedImageFormat.Webp, WebpQuality);

        var output = new MemoryStream();
        data.SaveTo(output);
        output.Position = 0;
        return output;
    }

    // Telefon fotoğrafları çoğu zaman yan kaydedilir ve yönü EXIF'te tutulur; EXIF atılacağı için yön piksellere uygulanır.
    private static SKBitmap ApplyOrientation(SKBitmap bitmap, SKEncodedOrigin origin)
    {
        float w = bitmap.Width, h = bitmap.Height;

        // Kaynaktaki (x, y) noktasının hedefteki yeri: x' = ScaleX·x + SkewX·y + TransX, y' = SkewY·x + ScaleY·y + TransY
        SKMatrix matrix = origin switch
        {
            SKEncodedOrigin.TopRight => new SKMatrix(-1, 0, w, 0, 1, 0, 0, 0, 1),
            SKEncodedOrigin.BottomRight => new SKMatrix(-1, 0, w, 0, -1, h, 0, 0, 1),
            SKEncodedOrigin.BottomLeft => new SKMatrix(1, 0, 0, 0, -1, h, 0, 0, 1),
            SKEncodedOrigin.LeftTop => new SKMatrix(0, 1, 0, 1, 0, 0, 0, 0, 1),
            SKEncodedOrigin.RightTop => new SKMatrix(0, -1, h, 1, 0, 0, 0, 0, 1),
            SKEncodedOrigin.RightBottom => new SKMatrix(0, -1, h, -1, 0, w, 0, 0, 1),
            SKEncodedOrigin.LeftBottom => new SKMatrix(0, 1, 0, -1, 0, w, 0, 0, 1),
            _ => SKMatrix.Identity,
        };
        if (matrix == SKMatrix.Identity) return bitmap.Copy();

        var swap = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop
            or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var result = swap
            ? new SKBitmap(bitmap.Height, bitmap.Width, bitmap.ColorType, bitmap.AlphaType)
            : new SKBitmap(bitmap.Width, bitmap.Height, bitmap.ColorType, bitmap.AlphaType);

        using var canvas = new SKCanvas(result);
        using var image = SKImage.FromBitmap(bitmap);
        canvas.SetMatrix(matrix);
        canvas.DrawImage(image, 0, 0, new SKSamplingOptions(SKFilterMode.Linear));
        return result;
    }
}
