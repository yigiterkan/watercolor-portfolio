namespace Watercolor.Api.Storage;

public static class ImageFormat
{
    // Tür, istemcinin gönderdiği dosya adına ya da Content-Type'a değil ilk baytlara bakılarak belirlenir.
    public static async Task<string?> DetectExtensionAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        var header = new byte[12];
        var read = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);
        stream.Position = 0;
        if (read < header.Length) return null;

        if (header is [0xFF, 0xD8, 0xFF, ..]) return ".jpg";
        if (header is [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ..]) return ".png";
        if (header is [(byte)'R', (byte)'I', (byte)'F', (byte)'F', _, _, _, _, (byte)'W', (byte)'E', (byte)'B', (byte)'P'])
            return ".webp";

        return null;
    }
}
