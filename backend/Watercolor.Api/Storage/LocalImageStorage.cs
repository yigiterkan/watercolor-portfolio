namespace Watercolor.Api.Storage;

public class LocalImageStorage(IWebHostEnvironment env) : IImageStorage
{
    public const string RequestPath = "/uploads";

    private readonly string _root = GetRoot(env);

    public static string GetRoot(IWebHostEnvironment env) => Path.Combine(env.ContentRootPath, "uploads");

    public async Task<string> SaveAsync(Stream content, string extension, CancellationToken cancellationToken = default)
    {
        var directory = Path.Combine(_root, "artworks");
        Directory.CreateDirectory(directory);

        // Dosya adını istemciden almıyoruz; rastgele ad çakışmayı ve zararlı adları önler.
        var fileName = $"{Guid.NewGuid():N}{extension}";
        await using var file = File.Create(Path.Combine(directory, fileName));
        await content.CopyToAsync(file, cancellationToken);

        return $"{RequestPath}/artworks/{fileName}";
    }

    public Task DeleteAsync(string url)
    {
        if (!url.StartsWith(RequestPath + "/", StringComparison.Ordinal)) return Task.CompletedTask;

        var relative = url[(RequestPath.Length + 1)..];
        var fullPath = Path.GetFullPath(Path.Combine(_root, relative));

        // Adres uploads klasörünün dışını gösteriyorsa dokunma.
        if (fullPath.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal) && File.Exists(fullPath))
            File.Delete(fullPath);

        return Task.CompletedTask;
    }
}
