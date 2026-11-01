namespace Watercolor.Api.Payments;

public class PaymentExpiryService(IServiceScopeFactory scopes, ILogger<PaymentExpiryService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<PaymentService>().ExpireStaleAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Süresi dolan ödemeler kontrol edilemedi");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
