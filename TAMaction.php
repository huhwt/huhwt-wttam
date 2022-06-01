<?php

declare(strict_types=1);

namespace HuHwt\WebtreesMods\TAMchart;

use Aura\Router\RouterContainer;
use Aura\Router\Map;
use fisharebest\Localization\Translation;
use Fisharebest\webtrees\module\AbstractModule;
use Fisharebest\Webtrees\Module\ModuleCustomInterface;
use Fisharebest\Webtrees\Module\ModuleCustomTrait;
use Fisharebest\Webtrees\Http\ViewResponseTrait;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\View;
use Fisharebest\Webtrees\Module\ModuleInterface;
use Fisharebest\Webtrees\Module\ModuleGlobalInterface;

use Fisharebest\Webtrees\Session;
use Fisharebest\Webtrees\Tree;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

use function app;
use function assert;
use function e;

/**
 * Class TAMaction
 */
class TAMaction extends AbstractModule 
    implements ModuleGlobalInterface, ModuleCustomInterface, ModuleInterface
{
    use ModuleCustomTrait;
    use ViewResponseTrait;

    private const ROUTE_DEFAULT = 'huhwt-TAMaction';
    // private const ROUTE_URL = '/tree/{tree}/TAMchart&actKey={actKey}';
    private const ROUTE_URL = '/TAMaction&actKey={actKey}';

    private $huh;

    public function __construct() {
      $this->huh = json_decode('"\u210D"') . "&" . json_decode('"\u210D"') . "wt";
    }

    /**
     * {@inheritDoc}
     * @see \Fisharebest\Webtrees\Module\ModuleCustomInterface::customModuleAuthorName()
     *
     * @return string
     */
    public function customModuleAuthorName(): string {

        return 'EW.Heinrich';
    }

    /**
     * {@inheritDoc}
     * @see \Fisharebest\Webtrees\Module\ModuleCustomInterface::customModuleVersion()
     *
     * @return string
     */
    public function customModuleVersion(): string {
        return '2.1.4.0.1';
    }

    /**
     * {@inheritDoc}
     * A URL that will provide the latest stable version of this module.
     *
     * @return string
     */
    public function customModuleLatestVersionUrl(): string {
        return 'https://github.com/huhwt/huhwt-wttam/master/latest-version.txt';
    }

    /**
     * {@inheritDoc}
     * @see \Fisharebest\Webtrees\Module\ModuleCustomInterface::customModuleSupportUrl()
     *
     * @return string
     */
    public function customModuleSupportUrl(): string {
        return 'https://github.com/huhwt/huhwt-wttam/issues';
    }

    /**
     * Additional/updated translations.
     *
     * @param string $language
     *
     * @return array<string,string>
     */
    public function customTranslations(string $language): array
    {
        // no differentiation according to language variants
        $_language = substr($language, 0, 2);
        $ret = [];
        $languageFile = $this->resourcesFolder() . 'lang/' . $_language . '.po';
        if (file_exists($languageFile)) {
            $ret = (new Translation($languageFile))->asArray();
        }
        return $ret;
    }

    /**
     * {@inheritDoc}
     * @see \Fisharebest\Webtrees\Module\AbstractModule::resourcesFolder()
     *
     * @return string
     */
    public function resourcesFolder(): string {
        return __DIR__ . DIRECTORY_SEPARATOR . 'resources' . DIRECTORY_SEPARATOR;
    }

    /**
     * {@inheritDoc}
     * @see \Fisharebest\Webtrees\Module\AbstractModule::title()
     *
     * @return string
     */
    public function title(): string 
    {
        $title = I18N::translate('TAMchart');
        return $this->huh . ' ' . $title;
    }

    /**
     * {@inheritDoc}
     * @see \Fisharebest\Webtrees\Module\AbstractModule::description()
     *
     * @return string
     */
    public function description(): string 
    {
        return I18N::translate('Download Gedcom information to client-side for postprocessing in TAM.');
    }

    /**
     * CSS class for the URL.
     *
     * @return string
     */
    /**
     * Raw content, to be added at the end of the <head> element.
     * Typically, this will be <link> and <meta> elements.
     *
     * @return string
     */
    public function headContent(): string
    {
        return '';
    }

    /**
     * Raw content, to be added at the end of the <body> element.
     * Typically, this will be <script> elements.
     * @return string
     */
    public function bodyContent(): string
    {
        return '';
    }

    /**
     * {@inheritDoc}
     * @see \Fisharebest\Webtrees\Module\AbstractModule::boot()
     */
    public function boot(): void 
    {
        $router_container = app(RouterContainer::class);
        assert($router_container instanceof RouterContainer);
        $router = $router_container->getMap();
        // echo(json_encode($router->getRoutes()));

        $router->attach('', '/tree/{tree}', static function (Map $router) {
            // $router->extras([
            //     'middleware' => [
            //         AuthManager::class,
            //     ],
            // ]);

            $router->get(TAMaction::class, '/TAMaction');
            });
        // Here is also a good place to register any views (templates) used by the module.
        // This command allows the module to use: view($this->name() . '::', 'fish')
        // to access the file ./resources/views/fish.phtml
        View::registerNamespace($this->name(), $this->resourcesFolder() . 'views/');
    }

    /**
     * hook for calling TAM ...
     * it would be preferable to switch over to TAM seemlesly, but by now 
     * the action is managed by some javascript and a href opening the TAM-subsystem
     *
     * @param ServerRequestInterface $request
     *
     * @return ResponseInterface
     */
    public function getTAMAction(ServerRequestInterface $request): ResponseInterface
    {
        $tree = $request->getAttribute('tree');
        assert($tree instanceof Tree);

        $params = (array) $request->getQueryParams();
        $actKey = $params['actKey'] ?? '';

        $title = I18N::translate('TAM Launch');
        $label = I18N::translate('Key to retrieve data');

        // the path to TAM-subsystem - pure javascript, no php
        $TAMpath = e(asset('snip/'));
        $TAMpath = str_replace("/public/snip/", "", $TAMpath) . "/modules_v4/huhwt-wttam/_TAMchart_/index-dev.html";

        // we don't want to transfer gedcom directly - prepare url for AJAX call
        $urlAJAX = [];
        $urlAJAX['module'] = $this->name();
        $urlAJAX['action'] = 'Gedcom';
        $urlAJAX['actKey'] = $actKey;
        $urlAJAX['tree']   = $tree->name();

        // we habe two slots of javascript
        $jsImp[] = $this->assetUrl('js/TAMaction_DBman.js');
        $jsImp[] = $this->assetUrl('js/TAMaction.js');

        // TODO : 'module' is hardcoded - how to get the name from foreign PHP-class 'ClippingsCartModuleEnhanced20'?
        $module_cce = '_huhwt-cce_';

        return $this->viewResponse($this->name() . '::' . 'TAMaction', [
            'module_cce'     => $module_cce,
            'actKey'         => $actKey,
            'title'          => $title,
            'label'          => $label,
            'tree'           => $tree,
            'TAMpath'        => $TAMpath,
            'urlAJAX'        => $urlAJAX,
            'jsimp'          => $jsImp,
        ]);
    }

    /**
     * Transfer the Gedcom to the client side via AJAX-call
     *
     * @param string $route    this route ...
     * @param string $actKey    Key for access to session-stored gedcom
     * @param string $q    Key for access to session-stored gedcom
     * 
     * @return string
     */
    public function getGedcomAction(ServerRequestInterface $request): ResponseInterface
    {
        $params = (array) $request->getQueryParams();
        $actKey = $params['actKey'] ?? '';
        
        $gedKey = Session::get($actKey);
        $theGedcom = Session::get($gedKey);
        $encodedString = json_decode($theGedcom);

        return response($encodedString);
    }

    public function appName(): string
    {
        return $this->name;
    }
}