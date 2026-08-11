<?php

use App\Utils\ResponseUtil;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

// There is no app/Http/Kernel.php. Routing, middleware and exception rendering
// are configured here.
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // An unauthenticated API request must answer 401, never redirect.
        $middleware->redirectGuestsTo(function ($request) {
            return null;
        });
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AuthenticationException $e, $request) {
            return ResponseUtil::unauthorized();
        });

        $exceptions->render(function (AuthorizationException $e, $request) {
            return ResponseUtil::forbidden();
        });
    })->create();
