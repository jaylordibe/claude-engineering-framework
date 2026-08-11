<?php

namespace App\Data;

use App\Enums\AppPlatform;
use Illuminate\Support\Carbon;

// Typed transport between the layers. BaseData carries id, the audit
// timestamps, authUser and the MetaData query envelope.
class AppVersionData extends BaseData
{

    public function __construct(
        public string $version,
        public ?string $description,
        public AppPlatform $platform,
        public Carbon $releaseDate,
        public ?string $downloadUrl,
        public bool $forceUpdate,
        ...$args
    )
    {
        parent::__construct(...$args);
    }

}
