using System.Globalization;
using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Watercolor.Api.Payments;

namespace Watercolor.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(PaymentService payments, IPaymentGateway gateway, IOptions<PaymentOptions> options) : ControllerBase
{
    private static readonly CultureInfo TurkishCulture = CultureInfo.GetCultureInfo("tr-TR");

    private string FrontendUrl => options.Value.FrontendUrl.TrimEnd('/');

    // Ödeme sayfası, işlem bitince tarayıcıyı token ile buraya gönderir (form POST).
    [HttpPost("callback")]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> Callback([FromForm] string? token, CancellationToken cancellationToken)
    {
        var orderId = string.IsNullOrEmpty(token) ? null : await payments.CompleteAsync(token, cancellationToken);
        if (orderId is null) return Redirect($"{FrontendUrl}/orders?payment=failed");

        var paid = (await gateway.CheckAsync(token!, cancellationToken)).Paid;
        return Redirect($"{FrontendUrl}/orders/{orderId}?payment={(paid ? "success" : "failed")}");
    }

    [HttpGet("fake/{token}")]
    public IActionResult FakePage(string token)
    {
        if (gateway is not FakePaymentGateway fake || fake.Find(token) is not { } payment) return NotFound();

        var html = $$"""
            <!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>Test ödeme sayfası</title>
            <style>body{font-family:system-ui,sans-serif;max-width:420px;margin:48px auto;padding:0 16px;color:#1f2328}
            .note{background:#fff4e5;border:1px solid #f0c27b;padding:12px;border-radius:4px;font-size:14px}
            button{font-size:16px;padding:12px;width:100%;margin-top:12px;border:0;border-radius:4px;cursor:pointer}
            .ok{background:#3f6d94;color:#fff}.fail{background:#eee}</style></head><body>
            <h1>Test ödeme sayfası</h1>
            <p class="note">Bu sayfa yalnızca geliştirme ortamında, iyzico anahtarları tanımlı değilken görünür. Gerçek ödeme alınmaz.</p>
            <p>Sipariş #{{payment.OrderId}} · Tutar: <strong>{{payment.Amount.ToString("N2", TurkishCulture)}} TL</strong></p>
            <form method="post" action="/api/payments/fake/{{WebUtility.HtmlEncode(token)}}/pay"><button class="ok" name="result" value="success">Ödemeyi onayla</button></form>
            <form method="post" action="{{WebUtility.HtmlEncode(payment.CallbackUrl)}}"><input type="hidden" name="token" value="{{WebUtility.HtmlEncode(token)}}"><button class="fail">Ödemeyi reddet</button></form>
            </body></html>
            """;
        return Content(html, "text/html; charset=utf-8");
    }

    [HttpPost("fake/{token}/pay")]
    public IActionResult FakePay(string token)
    {
        if (gateway is not FakePaymentGateway fake || fake.Find(token) is not { } payment) return NotFound();
        fake.MarkPaid(token);

        var html = $$"""
            <!doctype html><html><body onload="document.forms[0].submit()">
            <form method="post" action="{{WebUtility.HtmlEncode(payment.CallbackUrl)}}"><input type="hidden" name="token" value="{{WebUtility.HtmlEncode(token)}}"><noscript><button>Devam</button></noscript></form>
            </body></html>
            """;
        return Content(html, "text/html; charset=utf-8");
    }
}
