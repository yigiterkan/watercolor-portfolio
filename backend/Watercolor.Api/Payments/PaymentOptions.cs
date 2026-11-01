namespace Watercolor.Api.Payments;

public class PaymentOptions
{
    // Ödeme sayfasından dönüşte kullanıcının geleceği frontend adresi.
    public string FrontendUrl { get; set; } = "http://localhost:5173";

    // Bu süre içinde ödenmeyen sipariş iptal edilir ve stok geri döner.
    public int TimeoutMinutes { get; set; } = 30;
}

public class IyzicoOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://sandbox-api.iyzipay.com";

    // iyzico alıcı için TC kimlik no ister; sitede sormadığımız için yer tutucu gönderilir.
    public string DefaultIdentityNumber { get; set; } = "11111111111";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(SecretKey);
}
