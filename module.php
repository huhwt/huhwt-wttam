<?php

/**
 * See LICENSE.md file for further details.
 */

declare(strict_types=1);

namespace HuHwt\WebtreesMods\TAMchart;

use Fisharebest\Webtrees\Webtrees;
use Fisharebest\Webtrees\Registry;

use HuHwt\WebtreesMods\TAMchart\TAMaction;

//webtrees major version switch
if (defined("WT_VERSION"))
    {
    //this is a webtrees 2.x module. it cannot be used with webtrees 1.x. See README.md.
    return;
    } else {
    $version = Webtrees::VERSION;
}

// Register our namespace
require_once __DIR__ . '/autoload.php';

// Create and return instance of the module
return Registry::container()->get(TAMaction::class);
