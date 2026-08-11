<?php

namespace App\Enums;

enum UserPermission: string
{

    case CREATE_USER = 'create_user';
    case READ_USER = 'read_user';
    case UPDATE_USER = 'update_user';
    case DELETE_USER = 'delete_user';

    /**
     * The guard the gates are resolved against.
     *
     * @return string
     */
    public static function getApiGuardName(): string
    {
        return 'api';
    }

}
