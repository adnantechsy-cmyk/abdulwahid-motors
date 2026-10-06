<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A message sent through the website's contact form. */
class ContactMessage extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['mailed_at' => 'datetime'];
}
