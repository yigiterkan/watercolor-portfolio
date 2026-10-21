namespace Watercolor.Api.Storage;

public interface IImageStorage
{
    Task<string> SaveAsync(Stream content, string extension, CancellationToken cancellationToken = default);

    Task DeleteAsync(string url);
}
