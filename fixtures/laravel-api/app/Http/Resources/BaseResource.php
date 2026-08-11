<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class BaseResource extends JsonResource
{

    /**
     * Column names are snake_case; the response is camelCase. The audit
     * columns are withheld from every response.
     *
     * @return array
     */
    public function transformAttributes(): array
    {
        $allAttributes = $this->resource->toArray();
        $customHiddenAttributes = ['deleted_at', 'created_by', 'updated_by', 'deleted_by'];
        $transformedData = [];

        foreach ($allAttributes as $key => $value) {
            if (in_array($key, $customHiddenAttributes)) {
                continue;
            }

            $transformedData[Str::camel($key)] = $value;
        }

        return $transformedData;
    }

    /**
     * @param Request $request
     *
     * @return array
     */
    public function toArray(Request $request): array
    {
        return $this->transformAttributes();
    }

}
