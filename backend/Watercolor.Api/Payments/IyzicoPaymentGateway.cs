using System.Globalization;
using Iyzipay;
using Iyzipay.Model;
using Iyzipay.Request;
using Microsoft.Extensions.Options;
using Watercolor.Api.Models;

namespace Watercolor.Api.Payments;

public class IyzicoPaymentGateway(IOptions<IyzicoOptions> settings, ILogger<IyzicoPaymentGateway> logger) : IPaymentGateway
{
    private readonly IyzicoOptions _settings = settings.Value;

    private Iyzipay.Options ClientOptions => new()
    {
        ApiKey = _settings.ApiKey,
        SecretKey = _settings.SecretKey,
        BaseUrl = _settings.BaseUrl,
    };

    public async Task<PaymentStart> StartAsync(Order order, PaymentBuyer buyer, string callbackUrl, CancellationToken cancellationToken)
    {
        if (!_settings.IsConfigured) return new PaymentStart(false, Error: "Ödeme sistemi yapılandırılmamış.");

        var (name, surname) = SplitName(buyer.FullName);
        var address = new Address
        {
            ContactName = buyer.FullName,
            City = order.ShippingCity,
            Country = "Turkey",
            Description = order.ShippingAddress,
        };

        var request = new CreateCheckoutFormInitializeRequest
        {
            Locale = Locale.TR.ToString(),
            ConversationId = order.Id.ToString(CultureInfo.InvariantCulture),
            Price = Format(order.TotalPrice),
            PaidPrice = Format(order.TotalPrice),
            Currency = Currency.TRY.ToString(),
            BasketId = order.Id.ToString(CultureInfo.InvariantCulture),
            PaymentGroup = PaymentGroup.PRODUCT.ToString(),
            CallbackUrl = callbackUrl,
            Buyer = new Buyer
            {
                Id = buyer.Id,
                Name = name,
                Surname = surname,
                Email = buyer.Email,
                IdentityNumber = _settings.DefaultIdentityNumber,
                RegistrationAddress = order.ShippingAddress,
                City = order.ShippingCity,
                Country = "Turkey",
                Ip = buyer.Ip,
            },
            ShippingAddress = address,
            BillingAddress = address,
            // iyzico sepet kaleminde adet tutmaz; her kalem toplam tutarıyla gönderilir.
            BasketItems = order.Items.Select(item => new BasketItem
            {
                Id = item.Id.ToString(CultureInfo.InvariantCulture),
                Name = item.ArtworkTitle,
                Category1 = item.VariantType == VariantType.Original ? "Orijinal eser" : "Baskı",
                ItemType = BasketItemType.PHYSICAL.ToString(),
                Price = Format(item.UnitPrice * item.Quantity),
            }).ToList(),
        };

        var result = await CheckoutFormInitialize.Create(request, ClientOptions);
        if (result.Status != Status.SUCCESS.ToString())
        {
            logger.LogWarning("iyzico ödeme başlatılamadı (sipariş {OrderId}): {Code} {Message}", order.Id, result.ErrorCode, result.ErrorMessage);
            return new PaymentStart(false, Error: result.ErrorMessage);
        }

        return new PaymentStart(true, result.Token, result.PaymentPageUrl);
    }

    public async Task<PaymentCheck> CheckAsync(string token, CancellationToken cancellationToken)
    {
        if (!_settings.IsConfigured) return new PaymentCheck(false, Error: "Ödeme sistemi yapılandırılmamış.");

        var result = await CheckoutForm.Retrieve(
            new RetrieveCheckoutFormRequest { Locale = Locale.TR.ToString(), Token = token },
            ClientOptions);

        var paid = result.Status == Status.SUCCESS.ToString() && result.PaymentStatus == "SUCCESS";
        int? orderId = int.TryParse(result.BasketId, CultureInfo.InvariantCulture, out var id) ? id : null;
        if (!paid) return new PaymentCheck(false, orderId, Error: result.ErrorMessage);

        var transactions = (result.PaymentItems ?? [])
            .Where(i => int.TryParse(i.ItemId, CultureInfo.InvariantCulture, out _))
            .ToDictionary(i => int.Parse(i.ItemId, CultureInfo.InvariantCulture), i => i.PaymentTransactionId);

        return new PaymentCheck(
            true,
            orderId,
            decimal.Parse(result.PaidPrice, CultureInfo.InvariantCulture),
            result.PaymentId,
            transactions);
    }

    // Aynı gün içinde tüm ödeme iptal edilebilir; sonrasında kalem kalem iade gerekir.
    public async Task<bool> RefundAsync(Order order, string ip, CancellationToken cancellationToken)
    {
        if (!_settings.IsConfigured || order.PaymentId is null) return false;

        var cancel = await Cancel.Create(new CreateCancelRequest
        {
            Locale = Locale.TR.ToString(),
            ConversationId = order.Id.ToString(CultureInfo.InvariantCulture),
            PaymentId = order.PaymentId,
            Ip = ip,
        }, ClientOptions);
        if (cancel.Status == Status.SUCCESS.ToString()) return true;

        foreach (var item in order.Items)
        {
            if (item.PaymentTransactionId is null) return false;

            var refund = await Refund.Create(new CreateRefundRequest
            {
                Locale = Locale.TR.ToString(),
                ConversationId = order.Id.ToString(CultureInfo.InvariantCulture),
                PaymentTransactionId = item.PaymentTransactionId,
                Price = Format(item.UnitPrice * item.Quantity),
                Currency = Currency.TRY.ToString(),
                Ip = ip,
            }, ClientOptions);

            if (refund.Status != Status.SUCCESS.ToString())
            {
                logger.LogError("iyzico iadesi başarısız (sipariş {OrderId}, kalem {ItemId}): {Message}", order.Id, item.Id, refund.ErrorMessage);
                return false;
            }
        }
        return true;
    }

    // iyzico tutarları nokta ayraçlı bekler; bilgisayarın dil ayarı ne olursa olsun.
    private static string Format(decimal amount) => amount.ToString("0.00", CultureInfo.InvariantCulture);

    private static (string Name, string Surname) SplitName(string fullName)
    {
        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch
        {
            0 => ("-", "-"),
            1 => (parts[0], parts[0]),
            _ => (string.Join(' ', parts[..^1]), parts[^1]),
        };
    }
}
