<?php

namespace App\Enums;

use App\Traits\EnumTrait;

enum AppPlatform: string
{

    use EnumTrait;

    case ANDROID = 'android';
    case IOS = 'ios';
    case WEB = 'web';

}
