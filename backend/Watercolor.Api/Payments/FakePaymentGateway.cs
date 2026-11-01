using System.Collections.Concurrent;
using Watercolor.Api.Models;

namespace Watercolor.Api.Payments;

// Yalnızca geliştirme ortamında, iyzico anahtarları tanımlı değilken kullanılır.
// Ödeme sayfası yerine "başarılı / başarısız" düğmeli basit bir test sayfası açar.
public class FakePaymentGateway : IPaymentGateway
{
    private record FakePayment(int OrderId, decimal Amount, Dictionary<int, string> Items, string CallbackUrl)
    {
        public bool Paid { get; set; }
    }

    private readonly ConcurrentDictionary<string, FakePayment> _payments = new();

    public ConcurrentBag<int> Refunds { get; } = [];

    public Task<PaymentStart> StartAsync(Order order, PaymentBuyer buyer, string callbackUrl, CancellationToken cancellationToken)
    {
        var token = Guid.NewGuid().ToString("N");
        _payments[token] = new FakePayment(order.Id, order.TotalPrice, order.Items.ToDictionary(i => i.Id, _ => Guid.NewGuid().ToString("N")), callbackUrl);

        var origin = callbackUrl[..callbackUrl.IndexOf("/api/", StringComparison.Ordinal)];
        return Task.FromResult(new PaymentStart(true, token, $"{origin}/api/payments/fake/{token}"));
    }

    public Task<PaymentCheck> CheckAsync(string token, CancellationToken cancellationToken)
    {
        if (!_payments.TryGetValue(token, out var payment)) return Task.FromResult(new PaymentCheck(false, Error: "Bilinmeyen ödeme."));
        return Task.FromResult(payment.Paid
            ? new PaymentCheck(true, payment.OrderId, payment.Amount, $"fake-{token[..8]}", payment.Items)
            : new PaymentCheck(false, payment.OrderId));
    }

    public Task<bool> RefundAsync(Order order, string ip, CancellationToken cancellationToken)
    {
        Refunds.Add(order.Id);
        return Task.FromResult(true);
    }

    public (int OrderId, decimal Amount, string CallbackUrl)? Find(string token) =>
        _payments.TryGetValue(token, out var p) ? (p.OrderId, p.Amount, p.CallbackUrl) : null;

    public void MarkPaid(string token)
    {
        if (_payments.TryGetValue(token, out var payment)) payment.Paid = true;
    }
}
