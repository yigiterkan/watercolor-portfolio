using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Watercolor.Api.Auth;
using Watercolor.Api.Dtos;
using Watercolor.Api.Models;

namespace Watercolor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(UserManager<AppUser> userManager, TokenService tokenService) : ControllerBase
{
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var user = new AppUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName.Trim(),
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        await userManager.AddToRoleAsync(user, Roles.User);

        return await CreateAuthResponse(user);
    }

    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user is null)
            return InvalidCredentials();

        if (await userManager.IsLockedOutAsync(user))
            return LockedOut();

        if (!await userManager.CheckPasswordAsync(user, request.Password))
        {
            // Yanlış denemeyi say; sınır aşıldıysa Identity hesabı kilitler.
            await userManager.AccessFailedAsync(user);
            return await userManager.IsLockedOutAsync(user) ? LockedOut() : InvalidCredentials();
        }

        await userManager.ResetAccessFailedCountAsync(user);
        return await CreateAuthResponse(user);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = User.GetUserId();
        var user = userId is null ? null : await userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        return ToDto(user, await userManager.GetRolesAsync(user));
    }

    private ObjectResult InvalidCredentials() =>
        Problem(statusCode: StatusCodes.Status401Unauthorized, title: "E-posta veya şifre hatalı.");

    private ObjectResult LockedOut() =>
        Problem(
            statusCode: StatusCodes.Status429TooManyRequests,
            title: "Çok fazla hatalı deneme yapıldı. Hesap 15 dakikalığına kilitlendi.");

    private async Task<AuthResponse> CreateAuthResponse(AppUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        var (token, expiresAt) = tokenService.CreateToken(user, roles);

        return new AuthResponse(token, expiresAt, ToDto(user, roles));
    }

    private static UserDto ToDto(AppUser user, IList<string> roles) =>
        new(user.Id, user.Email!, user.FullName, roles);
}
