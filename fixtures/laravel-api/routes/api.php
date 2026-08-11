<?php

use App\Http\Controllers\AppVersionController;
use Illuminate\Support\Facades\Route;

// Public routes. Anything outside the auth:api group below is reachable
// without a token.
Route::middleware(['throttle:public'])->group(function () {
    Route::get('app-versions/latest', [AppVersionController::class, 'getLatest']);
});

// Authenticated routes.
Route::middleware(['auth:api', 'throttle:api'])->group(function () {
    Route::prefix('app-versions')->group(function () {
        Route::post('/', [AppVersionController::class, 'create']);
        Route::get('/', [AppVersionController::class, 'getPaginated']);
        Route::get('/{appVersionId}', [AppVersionController::class, 'getById'])->where('appVersionId', config('custom.numeric_regex'));
        Route::put('/{appVersionId}', [AppVersionController::class, 'update'])->where('appVersionId', config('custom.numeric_regex'));
        Route::delete('/{appVersionId}', [AppVersionController::class, 'delete'])->where('appVersionId', config('custom.numeric_regex'));
    });
});
