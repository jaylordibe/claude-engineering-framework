<?php

namespace App\Data;

use App\Enums\AppPlatform;

class AppVersionFilterData extends BaseData
{

    public function __construct(
        public ?AppPlatform $platform = null,
        ...$args
    )
    {
        parent::__construct(...$args);
    }

}
