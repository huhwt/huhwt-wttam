<?php

namespace HuHwt\WebtreesMods\TAMchart;

use Composer\Autoload\ClassLoader;

$loader = new ClassLoader();
$loader->addPsr4('HuHwt\\WebtreesMods\\TAMchart\\', __DIR__ );
$loader->addPsr4('HuHwt\\WebtreesMods\\TAMchart\\', __DIR__ . '/resources');
// $loader->addPsr4('HuHwt\\WebtreesMods\\Module\\TAMchart\\', __DIR__ . '/Module');

$loader->register();
