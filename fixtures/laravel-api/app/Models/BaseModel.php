<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Model properties
 * @property int $id
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property int|null $deleted_by
 *
 * @mixin Builder
 */
class BaseModel extends Model
{

    use SoftDeletes, HasFactory;

    // Nothing is deleted for real, and the acting user is stamped from the
    // authenticated session rather than passed in by the caller.
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (Auth::check()) {
                if (!$model->isDirty('created_by')) {
                    $model->created_by = Auth::id();
                }

                if (!$model->isDirty('updated_by')) {
                    $model->updated_by = Auth::id();
                }
            }
        });

        static::updating(function (self $model) {
            if (Auth::check() && !$model->isDirty('updated_by')) {
                $model->updated_by = Auth::id();
            }
        });
    }

}
