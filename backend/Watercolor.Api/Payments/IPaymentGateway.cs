using Watercolor.Api.Models;

namespace Watercolor.Api.Payments;

public record PaymentBuyer(string Id, string FullName, string Email, string Ip);

public record PaymentStart(bool Success, string? Token = null, string? PaymentPageUrl = null, string? Error = null);

public record PaymentCheck(
    bool Paid,
    int? OrderId = null,
    decimal PaidPrice = 0,
    string? PaymentId = null,
    IReadOnlyDictionary<int, string>? ItemTransactionIds = null,
    string? Error = null);

public interface IPaymentGateway
{
    Task<PaymentStart> StartAsync(Order order, PaymentBuyer buyer, string callbackUrl, CancellationToken cancellationToken);

    // Sonucu ödeme sağlayıcısına sorar; tarayıcıdan gelen bilgiye güvenilmez.
    Task<PaymentCheck> CheckAsync(string token, CancellationToken cancellationToken);

    Task<bool> RefundAsync(Order order, string ip, CancellationToken cancellationToken);
}
