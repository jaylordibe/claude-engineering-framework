<?php

namespace App\Providers;

use App\Enums\UserPermission;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        Passport::tokensExpireIn(now()->addHours(8));
        Passport::refreshTokensExpireIn(now()->addDays(30));

        // Named limiters referenced by the route groups. The values are config,
        // never magic numbers.
        RateLimiter::for('public', function (Request $request) {
            return Limit::perMinute(config('custom.rate_limits.public'))->by('ip:' . $request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            $user = $request->user();
            $tokenId = $user?->token()?->id;
            $ip = $request->ip();

            return [
                Limit::perMinute(config('custom.rate_limits.api_per_token'))->by($tokenId ? "token:$tokenId" : "ip:$ip"),
                Limit::perMinute(config('custom.rate_limits.api_per_ip'))->by("ip:$ip"),
            ];
        });

        // Record-level access is a gate per permission case, resolved against
        // the api guard. Controllers call Gate::authorize(...) explicitly; there
        // is no permission middleware on the routes.
        foreach (UserPermission::cases() as $permission) {
            Gate::define($permission, function (User $user) use ($permission) {
                return $user->hasPermissionTo($permission, UserPermission::getApiGuardName());
            });
        }
    }

}
