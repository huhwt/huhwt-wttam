///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
// i18n functionality added by huhwt
// Web storage functionality added by huhwt
// 
// Interaction Management
//
///////////////////////////////////////////////////////////////////////////////

import * as gui from "./guiparts.js";
import { TICKCOUNTER_html } from "./tickcounter.js";
// import { default as i18n } from "./i18n.js";
import { switch_locale } from "./translations.js";
import * as parms from "./parms.js";
import * as DBman from "./dbman.js";
import { onChangeFile, openNewTab, loadDataFromIDB, resetSVGLayers } from "./interfaces.js";
import { createDownloadSVG, dump_Htree } from "./export.js";
import { TFMRenderer } from "./TFMrenderer.js";

export function initInteractions(objRef) 
{
    // Add pattern for single heightfield selection and highlighting

    // let renderer = parms.oGET("RENDERER");
    let sSuff = objRef.get_sKENN();
    let sKENN = "#s" + sSuff;

    let the_SVG = d3.select(sKENN);
    let the_def = the_SVG.select("defs");
    let the_defs = the_def._groups[0][0];
    let makePattern = (the_defs.childElementCount == 2 ? true : false);
    if (makePattern) {
        let pKENN = "pattern" + sSuff;
        the_def.append("pattern")
            .attr("id",pKENN)
            .attr("width", 40)
            .attr("height", 40)
            .attr("patternUnits","userSpaceOnUse")
            .append("path")
            .attr("fill","none")
            .attr("stroke","#111")
            .attr("stroke-width","2") 
            //.attr("d","M-1,1 l2,-2 M0,20 l20,-20 M19,21 l2,-2");
            .attr("d","M0,40 l40,-40 M0,0 l40,40")
            ;
    }

    // initialize Menubar
    if (makePattern) {
        initMenubar();
    }

    // initialize zoom and pan capabilities
    if (makePattern) {
        let the_CANVAS = objRef.CANVAS;
        var the_zoom = d3.zoom()
                    .scaleExtent([0.01, 100])
                    .on("zoom", function({transform}) { the_CANVAS.attr("transform", transform); });
        objRef.zoomO = the_zoom;
        the_SVG
            .call(the_zoom)
            .on('dblclick.zoom', null)
            ;
    }

    // initialize tooltips for hovering over nodes
    initTooltip(objRef);

    // initialize tooltips for hovering over contours
    inittooltipYV(objRef);

    // define interaction possibilities for graph svg
    setTAMInteractions(objRef);

    // define interaction possibilities for menu bar
    setMenubarInteractions(objRef);

    // reset tickCounterInfo
    initTickCountInfo();

}

export function initTickCountInfo() {
    putTickCountInfo("#tcinfo_cnts", "_");
    putTickCountInfo("#tClevel", "_");
    putTickCountInfo("#tcinfo_ncount", "_");
    putTickCountInfo("#tcinfo_level", "_");
    putTickCountInfo("#tcinfo_check", "_");
    putTickCountInfo("#tcinfo_cycles", "_");
    putTickCountInfo("#tcinfo_modvalue", "_");
}

export function toggleSVG(renderer) {
    let sSuff = renderer.get_sKENN();
    let sKENN = "#s" + sSuff;
    let _svg = d3.select(sKENN);
    let _isVisible = _svg.style("display");
    switch (_isVisible) {
        case "none":
            _svg.style("display", "inline");
            break;
        default:
            _svg.style("display", "none");
        }

}
/////////////////////////////////////////////////////////////////////////////
///  SVG INTERACTIONS

function setTAMInteractions()
{
    // events
    d3.select("body")
        .on("keydown", function(event) {
            if (event.srcElement.className != "filelabel") {
                if (event.key == "S".charCodeAt(0)) {
                    toggleShading();
                    d3.select("#settings_shading").property('checked', parms.GET("SHADING"));
                }
                else if (event.keyCode == "R".charCodeAt(0)) {
                    toggleReverseColormap();
                    d3.select("#settings_reversecolor").property('checked', parms.GET("REVERSE_COLORMAP"));
                }
                else if (event.keyCode == "H".charCodeAt(0)) {
                    toggleSelectTime();
                    d3.select("#settings_select_time").property('checked', parms.GET("USE_MOUSEOVER"));
                }
                else if (event.keyCode == i18n("kc_Y").charCodeAt(0)) {
                    toggleShowYearValues();
                    d3.select("#settings_show_yearvalues").property('checked', parms.GET("SHOW_YEARVALUES"));
                }
                else if (event.keyCode == "I".charCodeAt(0)) {
                    toggleShowTooltips();
                    d3.select("#settings_show_tooltips").property('checked', parms.GET("SHOW_TOOLTIPS"));
                }
                else if (event.keyCode == "C".charCodeAt(0)) {
                    toggleShowTickcount();
                    d3.select("#settings_show_tickcount").property('checked', parms.GET("SHOW_TICKCOUNT"));
                }
                else if (event.keyCode == "F".charCodeAt(0)) {
                    toggleEnergizeSimulation();
                    d3.select("#settings_freeze").property('checked', !parms.GET("ENERGIZE"));
                }
                else if (event.keyCode == "N".charCodeAt(0)) {
                    toggleNames();
                    d3.select("#settings_show_names").property('checked', parms.GET("SHOW_NAMES"));
                }
                else if(event.keyCode == "G".charCodeAt(0)) {
                    toggleShowGraph();
                    d3.select("#settings_show_graph").property('checked', parms.GET("SHOW_GRAPH"));
                }
                else if (event.keyCode == i18n("kc_M").charCodeAt(0)) {
                    toggleShowContours();
                    d3.select("#settings_show_contours").property('checked', parms.GET("SHOW_CONTOURS"));
                }
                else if (event.keyCode == "E".charCodeAt(0)) {
                    toggleLifelines();
                    d3.select("#settings_show_lifelines").property('checked', parms.GET("SHOW_LIFELINES"));
                }
                else if (event.keyCode == "L".charCodeAt(0)) {
                    toggleLinks();
                    d3.select("#settings_show_links").property('checked', parms.GET("SHOW_LINKS"));
                }
                else if (event.keyCode == "T".charCodeAt(0)) {
                    toggleShowTunnels();
                    d3.select("#settings_show_tunnels").property('checked', parms.GET("SHOW_TUNNELS"));
                }
                else if (event.keyCode == "E".charCodeAt(0)) {
                    document.getElementById("btnSvgExport").click();
                }
            }
        });
}


export function setTAMDragactions(objRef)
{
    // make nodes draggable
    objRef.SVG_DRAGABLE_ELEMENTS.call(d3.drag()
        .on("start", dragStartNode)
        .on("drag", dragNode)
        .on("end", dragEndNode)
    );

    objRef.SVG_DRAGABLE_ELEMENTS
        .on("click", onMouseClick)
        .on("dblclick", onDblClick);
}
//---------------------------------------------------------------------------
function onMouseClick(event, d)
{
    d.fx = d.fy = null;
    if (d.type == "FAMILY")
        return;
    if (d.sr == 2)
        d.sr = 1;
    let renderer = parms.oGET("RENDERER");
    renderer.Htreed = -1;
}
//---------------------------------------------------------------------------
function onDblClick(event, d)
{
    if (d.type == "FAMILY") {
        d.fx = d.x;
        d.fy = d.y;
    } else if (d.type == "PERSON") {
        d.sr = 2;
        dump_Htree(d);
        openNewTab("indexHT");
        // EW.H mod ... set Htreed-Status for to mark Htreed person
        d.fx = d.x;
        d.fy = d.y;
        let renderer = parms.oGET("RENDERER");
        renderer.Htreed = 1;
    }
}
//---------------------------------------------------------------------------
function mouseoverContour(event, c)
{
    let renderer = parms.oGET("RENDERER");
    if (parms.GET("USE_MOUSEOVER")) {
        renderer.SVG_CONTOURS
            .attr("fill",
                function(d)
                {
                    // Currently selected one will be always at 0.5
                    if (c.value === d.value)
                    {
                        return "url(#myPattern) #000";//chromadepth(0.5);
                    }
                    return renderer.SVG_COLORMAP(d.value);
                }
            );
    }
}
//---------------------------------------------------------------------------
function dragStartNode(event, d)
{
    event.sourceEvent.stopPropagation();
    let renderer = parms.oGET("RENDERER");
    if (!event.active)
    {
        renderer.resetScalarField(renderer.instance);

        if (!parms.GET("ENERGIZE"))
            renderer.FORCE_SIMULATION.velocityDecay(1);    // don't move anything than the selected node!

        renderer.FORCE_SIMULATION.alpha(parms.GET("ALPHA")).restart();
    }
    d.fx = d.x;
    d.fy = d.y;

    if (parms.GET("SHOW_TOOLTIPS"))
        d3.select("#tooltip").style("opacity", parms.GET("TOOLTIP_DRAG_OPACITY"));
}
//---------------------------------------------------------------------------
function dragNode(event, d)
{
    d.fx = event.x;
    d.fy = event.y;

    if (parms.GET("SHOW_TOOLTIPS"))
        d3.select("#tooltip")
            .style("top", (event.sourceEvent.pageY - 10) + "px")
            .style("left", (event.sourceEvent.pageX + 15) + "px");
}
//---------------------------------------------------------------------------
function dragEndNode(event, d)
{
    if (!event.active && !parms.GET("ENERGIZE"))
        parms.oGET("RENDERER").FORCE_SIMULATION.velocityDecay(parms.GET("FRICTION")).alpha(0);    // reset friction

    //d.fx = d.fy = null;

    if (parms.GET("SHOW_TOOLTIPS"))
        d3.select("#tooltip").style("opacity", 1.0);
}
//---------------------------------------------------------------------------
function toggleEnergizeSimulation()
{
    parms.TOGGLE("ENERGIZE");
    let renderer = parms.oGET("RENDERER");
    let _go = parms.GET("ENERGIZE");
    if (_go)
    {
        renderer.resetScalarField(renderer.instance);
        renderer.FORCE_SIMULATION.alpha(parms.GET("ALPHA")).restart();
    }
    else
        renderer.FORCE_SIMULATION.alpha(0);
}
//---------------------------------------------------------------------------
function toggleShading()
{
    parms.TOGGLE("SHADING");
    let renderer = parms.oGET("RENDERER");
    renderer.SHADING_LAYER.attr("visibility", parms.GET("SHOW_CONTOURS") && parms.GET("SHADING") ? "visible" : "hidden");
}
//---------------------------------------------------------------------------
function toggleLinks()
{
    parms.TOGGLE("SHOW_LINKS");
    parms.oGET("RENDERER").toggleLinks(parms.GET("SHOW_LINKS"));
}
//---------------------------------------------------------------------------
function toggleShowGraph()
{
    parms.TOGGLE("SHOW_GRAPH");
    parms.oGET("RENDERER").GRAPH_LAYER.attr("visibility", parms.GET("SHOW_GRAPH") ? "visible" : "hidden");
}
//---------------------------------------------------------------------------
function toggleLifelines()
{
    let renderer = parms.oGET("RENDERER");
    if (renderer && renderer instanceof TFMRenderer) {
        parms.TOGGLE("SHOW_LIFELINES");
        let transform = renderer.CANVAS.attr("transform");  // save current view on canvas
        // save graph data
        let graph = renderer.GRAPH;
                
        // stop any running simulation and reset SVG layers
        if (renderer.FORCE_SIMULATION) 
            renderer.FORCE_SIMULATION.stop();
        resetSVGLayers(renderer);

        // create new renderer with the saved data
        /*jshint -W051 */
        renderer = null;
        renderer = new TFMRenderer();
        parms.oSET("RENDERER", renderer);
        // NOTE: graph already contains all the enriched data created during the createFamilyForceGraph procedure,
        //  as well as all the simulation (p.x/y) and layout (p.vis.x/y) position data. We can still pass it as is
        //  to the createFamilyForceGraph() function, we only need to make sure that any lifeline info is deleted
        //  in case it is toggled off.
        let _showLifelines = parms.GET("SHOW_LIFELINES");
        if (!_showLifelines)
            graph.persons.forEach( p => delete p.lifeline );

        renderer.createFamilyForceGraph(graph);

        // creating a new renderer created a new SVG CANVAS -> now restore view transform of this canvas
        renderer.CANVAS.attr("transform", transform);   
        parms.oSET("RENDERER", renderer);
    }
}
//---------------------------------------------------------------------------
function toggleShowContours()
{
    parms.TOGGLE("SHOW_CONTOURS");
    let renderer = parms.oGET("RENDERER");
    let _showContours = parms.GET("SHOW_CONTOURS");
    renderer.TOPO_LAYER.attr("visibility", _showContours || parms.GET("SHOW_YEARVALUES") ? "visible" : "hidden");
    renderer.SHADING_LAYER.attr("visibility", _showContours && parms.GET("SHADING") ? "visible" : "hidden");
}
//---------------------------------------------------------------------------
function toggleShowYearValues()
{
    parms.TOGGLE("SHOW_YEARVALUES");
    registertooltipYVeventhandler();
    // parms.oGET("RENDERER").TOPO_LAYER.attr("visibility", parms.GET("SHOW_CONTOURS") || parms.GET("SHOW_YEARVALUES") ? "visible" : "hidden");
    // parms.oGET("RENDERER").TOPO_LAYER.attr("visibility", parms.GET("SHOW_CONTOURS") ? "visible" : "hidden");
}
//---------------------------------------------------------------------------
function toggleNames()
{
    parms.TOGGLE("SHOW_NAMES");
    if (parms.GET("SHOW_NAMES"))
        parms.oGET("RENDERER").showNames();
    else
        parms.oGET("RENDERER").hideNames();
}
//---------------------------------------------------------------------------
function toggleShowTunnels()
{
    parms.TOGGLE("SHOW_TUNNELS");
    if (!parms.GET("ENERGIZE")) {
        let _renderer = parms.oGET("RENDERER");
        _renderer.updateScalarField(_renderer.instance);
    }
}
//---------------------------------------------------------------------------
function toggleReverseColormap() 
{
    parms.TOGGLE("REVERSE_COLORMAP");
    if (!parms.GET("ENERGIZE")) {
        let _renderer = parms.oGET("RENDERER");
        _renderer.setColorMap(_renderer.instance);
        _renderer.updateScalarField(_renderer.instance);
    }
}
//---------------------------------------------------------------------------
function toggleSelectTime()
{
    parms.TOGGLE("USE_MOUSEOVER");
    let renderer = parms.oGET("RENDERER");
    if (parms.GET("USE_MOUSEOVER") || parms.GET("SHOW_YEARVALUES")) {
        renderer.TOPO_LAYER.selectAll("path.contours").on("mouseover", mouseoverContour);
    } else {
        renderer.resetColormap();
        renderer.TOPO_LAYER.selectAll("path.contours").on("mouseover", null);
    }
}
//---------------------------------------------------------------------------
function toggleShowTooltips()
{
    parms.TOGGLE("SHOW_TOOLTIPS");
    registerTooltipEventhandler();
}
//---------------------------------------------------------------------------
function toggleShowTickcount()
{
    parms.TOGGLE("SHOW_TICKCOUNT");
    let _shTC = parms.GET("SHOW_TICKCOUNT");
    let _tcelem = d3.select("#tickcountInfo");
    if (_shTC) {
        _tcelem.style("display", "inline");
    } else {
        _tcelem.style("display", "none");
    }
}


/////////////////////////////////////////////////////////////////////////////
// This does *not* trigger any updates of the TAM,
// only the parameter menu is updated.
export function set_tamDefaultParameters()
{
    const isTFMRenderer = parms.oGET("RENDERER") instanceof TFMRenderer;
    // ("Loading default parameters for",
    console.log(i18n("L_dpf", { pTr: isTFMRenderer ? "TFMRenderer" : "TAMRenderer" } ));

    // Menu "Interaction"
    parms.SET("ENERGIZE", true);
    parms.SET("USE_MOUSEOVER", false);
    parms.SET("SHOW_YEARVALUES", false);
    parms.SET("SHOW_TOOLTIPS", true);
    parms.SET("SHOW_TICKCOUNT", false);

    // Menu "Force Layout"
    parms.SET("GRAVITY_X", isTFMRenderer ? 0.07 : 0.06);
    parms.SET("GRAVITY_Y", isTFMRenderer ? 0.07 : 0.06);
    parms.SET("REPULSION_STRENGTH", 400);
    parms.SET("LINK_STRENGTH", isTFMRenderer ? 1.8 : 0.8);
    parms.SET("SF_STRENGTH", 0);
    parms.SET("FRICTION", isTFMRenderer ? 0.2 : 0.4);

    // Menu "Graph Appearance"
    parms.SET("SHOW_GRAPH", true);
    parms.SET("SHOW_LINKS", true);
    parms.SET("SHOW_NAMES", true);
    parms.SET("LINK_WIDTH", 2);
    parms.SET("NODE_RADIUS", 10);
    parms.SET("PERSON_LABEL_OPACITY", 0.7);

    // Menu "Map Appearance"
    parms.SET("SHOW_CONTOURS", true);
    parms.SET("REVERSE_COLORMAP", false);
    parms.SET("INTERPOLATE_NN", false);
    parms.SET("EMBED_LINKS", true);
    parms.SET("SHOW_TUNNELS", true);
    parms.SET("SHADING", true);

    parms.SET("SCALARFIELD_DILATION_ITERS", 2);
    parms.SET("RANGE_MIN", 0);
    parms.SET("RANGE_MAX", 10);
    parms.SET("CONTOUR_STEP", 10);
    parms.SET("CONTOUR_BIG_STEP", 50);
    parms.SET("INDICATOR_FONTSIZE", 15);
    parms.SET("HEIGHT_SCALE", 50);
    parms.SET("SCALARFIELD_RESOLUTION", 400);
    parms.SET("LINK_SAMPLE_STEPSIZE", 2);
    parms.SET("UNDERGROUND_THRESHOLD", 10);

    // Without menu entry
    parms.SET("ARROW_RADIUS", isTFMRenderer ? 10 : 14);

    parms.SET("ACTIVE_LOCALE", "de");

    initMenubar(); // update visuals based on parameter values
}

///  MENUBAR INTERACTIONS

export function Wswitch_locale(_locale) {
    let active_language = i18n("ZZZZ");
    if (active_language != _locale) {
        parms.SET("ACTIVE_LOCALE", _locale);
        initMenubar();
        setMenubarInteractions();
    }
}

export function initMenubar()
{
    let active_language = i18n("ZZZZ");
    if (active_language != parms.GET("ACTIVE_LOCALE")) {
        switch_locale(parms.GET("ACTIVE_LOCALE"));
        let mbHTML = gui.MENUBAR_html();
        let MBelmnt = document.getElementById("menubar");
        MBelmnt.innerHTML = mbHTML;
        let ovHTML = gui.FILE_MODAL();
        let OVelmnt = document.getElementById("overlay");
        OVelmnt.innerHTML = ovHTML;
        let tcHTML = TICKCOUNTER_html();
        let TCelmnt = document.getElementById("tickcountInfo");
        TCelmnt.innerHTML = tcHTML;
    }

    d3.select("#settings_dataset").property("value", parms.GET("FILENAME"));

    // Load File
    // Save
    // Interaction
    d3.select("#settings_freeze").property('checked', !parms.GET("ENERGIZE"));
    d3.select("#settings_select_time").property('checked', parms.GET("USE_MOUSEOVER"));
    d3.select("#settings_show_yearvalues").property('checked', parms.GET("SHOW_YEARVALUES"));
    d3.select("#settings_show_tooltips").property('checked', parms.GET("SHOW_TOOLTIPS"));
    d3.select("#settings_show_tickcount").property('checked', parms.GET("SHOW_TICKCOUNT"));
    
    // Force Simulation
    d3.select("#settings_gravity_x").property('value', parms.GET("GRAVITY_X"));
    d3.select("#settings_gravity_y").property('value', parms.GET("GRAVITY_Y"));
    d3.select("#settings_repulsion_strength").property("value", parms.GET("REPULSION_STRENGTH"));
    d3.select("#settings_link_strength").property("value", parms.GET("LINK_STRENGTH"));    
    d3.select("#settings_simforce_strength").property("value", parms.GET("SF_STRENGTH"));    
    d3.select("#settings_friction").property("value", parms.GET("FRICTION"));

    // Graph Appearance
    d3.select("#settings_show_graph").property("checked", parms.GET("SHOW_GRAPH"));    
    d3.select("#settings_show_lifelines").property("checked", parms.GET("SHOW_LIFELINES"));    
    d3.select("#settings_show_links").property("checked", parms.GET("SHOW_LINKS"));    
    d3.select("#settings_show_names").property("checked", parms.GET("SHOW_NAMES"));    
    d3.select("#settings_linkwidth").property("value", parms.GET("LINK_WIDTH"));
    d3.select("#settings_noderadius").property("value", parms.GET("NODE_RADIUS"));
    d3.select("#settings_pnodeopacity").property("value", parms.GET("PERSON_LABEL_OPACITY"));

    // Map Appearance
    d3.select("#settings_show_contours").property("checked", parms.GET("SHOW_CONTOURS"));    
    d3.select("#settings_reversecolor").property('checked', parms.GET("REVERSE_COLORMAP"));
    d3.select("#settings_interpolation_type").property("checked", parms.GET("INTERPOLATE_NN"));
    d3.select("#settings_embed_links").property("checked", parms.GET("EMBED_LINKS"));
    d3.select("#settings_show_tunnels").property("checked", parms.GET("SHOW_TUNNELS"));    
    d3.select("#settings_shading").property('checked', parms.GET("SHADING"));
    d3.select("#settings_dilation_degree").property("value", parms.GET("SCALARFIELD_DILATION_ITERS"));
    d3.select("#settings_range_min").property("value", parms.GET("RANGE_MIN"));    
    d3.select("#settings_range_max").property("value", parms.GET("RANGE_MAX"));    
    d3.select("#settings_contour_step").property("value", parms.GET("CONTOUR_STEP"));
    d3.select("#settings_contour_big_step").property("value", parms.GET("CONTOUR_BIG_STEP"));    
    d3.select("#settings_indicator_size").property("value", parms.GET("INDICATOR_FONTSIZE"));    
    d3.select("#settings_height_scale").property("value", parms.GET("HEIGHT_SCALE"));        
    d3.select("#settings_resolution").property("value", parms.GET("SCALARFIELD_RESOLUTION"));    
    d3.select("#settings_link_sample_step").property("value", parms.GET("LINK_SAMPLE_STEPSIZE"));    
    d3.select("#settings_underground_threshold").property("value", parms.GET("UNDERGROUND_THRESHOLD"));    

}
//---------------------------------------------------------------------------
function setMenubarInteractions()
{
    let renderer = parms.oGET("RENDERER");

    //  Load From IDB
    d3.select("#btnLoad").on("click", function(event) {
        showIDBstate(event);
    });
    //  Load File
    d3.select("#browse").on("change", function(event) {
        onChangeFile(event);
    });
    d3.select("#fakeBrowse").on("click", function(event) {
        document.getElementById('browse').click();
    });
    //  Save
    d3.select("#btnSave").on("click", function (e) {
        renderer.saveData();
    });        
    d3.select("#btnSaveF").on("click", function (e) {
        renderer.saveDataF();
    });        
    d3.select("#btnSvgExport").on("click", function (e) {
        let _rkenn = renderer.svgKENN;
        let _elem = 's' + _rkenn;
        let _fnSVG = _rkenn + '.svg';
        createDownloadSVG(document.getElementById(_elem).outerHTML, _fnSVG);
    });        
    //  Interaction
    d3.select("#settings_freeze").on("click", function (e) {
        toggleEnergizeSimulation();
    });        
    d3.select("#settings_select_time").on("click", function(e){
        toggleSelectTime();
    });    
    d3.select("#settings_show_yearvalues").on("click", function(e){
        toggleShowYearValues();
    });    
    d3.select("#settings_show_tooltips").on("click", function (e) {
        toggleShowTooltips();
    });
    d3.select("#settings_show_tickcount").on("click", function (e) {
        toggleShowTickcount();
    });
    //  Force Simulation
    d3.select("#settings_gravity_x").on("input", function() {
        let _tv = parseFloat(this.value);
        parms.SET("GRAVITY_X", _tv);
        renderer.FORCE_SIMULATION.force("x", d3.forceX(0).strength(_tv));
    });
    d3.select("#settings_gravity_y").on("input", function() {
        let _tv = parseFloat(this.value);
        parms.SET("GRAVITY_Y", _tv);
        renderer.FORCE_SIMULATION.force("y", d3.forceY(0).strength(_tv));
    });
    d3.select("#settings_repulsion_strength").on("input", function() {
        let _tv = this.value;    
        parms.SET("REPULSION_STRENGTH", _tv);    
        renderer.REPULSION_FORCE.strength(-_tv);
    });
    d3.select("#settings_link_strength").on("input", function() {
        let _tv = this.value;    
        parms.SET("LINK_STRENGTH", _tv);    
        renderer.LINK_FORCE.strength(parms.GET("LINK_STRENGTH"));
    });
    d3.select("#settings_simforce_strength").on("input", function() {
        let _tv = parseFloat(this.value);
        parms.SET("SF_STRENGTH", _tv);    
    });
    d3.select("#settings_friction").on("input", function() {
        let _tv = parseFloat(this.value);
        parms.SET("FRICTION", _tv);
        renderer.FORCE_SIMULATION.velocityDecay(_tv);
    });
    //  Graph Appearance
    d3.select("#settings_show_graph").on("input", function() {
        toggleShowGraph();
    });
    d3.select("#settings_show_lifelines").on("input", function() {
		toggleLifelines();
	});
    d3.select("#settings_show_links").on("input", function() {
        toggleLinks();
    });
    d3.select("#settings_show_names").on("input", function() {
        toggleNames();
    });
    d3.select("#settings_linkwidth").on("input", function() {
        let _tv = parseInt(this.value);
        parms.SET("LINK_WIDTH", _tv);
        if (renderer.SVG_LINKS)    renderer.SVG_LINKS.attr("stroke-width", _tv + "px");
        if (renderer.SVG_LINKS_STREETS) renderer.SVG_LINKS_STREETS.attr("stroke-width", _tv + "px");
        if (renderer.SVG_LINKS_TUNNELS) renderer.SVG_LINKS_TUNNELS.attr("stroke-width", _tv + "px");
        if (renderer.SVG_TUNNEL_ENTRIES_1) renderer.SVG_TUNNEL_ENTRIES_1.attr("stroke-width", _tv + "px");
        if (renderer.SVG_TUNNEL_ENTRIES_2) renderer.SVG_TUNNEL_ENTRIES_2.attr("stroke-width", _tv + "px");
    });
    d3.select("#settings_noderadius").on("input", function() {
        let _tv = parseInt(this.value);
        parms.SET("NODE_RADIUS", _tv);
        if (renderer.PNODES) {
            let _tw = 2 * _tv;
            renderer.PNODES.forEach(n => {n.r0 = _tv; n.r = _tv;});
            if (renderer.SVG_NODE_CIRCLES) {
                renderer.SVG_NODE_CIRCLES
                    .attr("width", function (p) { return _tw; })
                    .attr("height", function (p) { return _tw; })
                ;
            }
        }
    });
    d3.select("#settings_pnodeopacity").on("input", function() {
        let _tv = parseFloat(this.value);
        parms.SET("PERSON_LABEL_OPACITY",_tv);
        if (renderer.SVG_NODE_LABELS) renderer.SVG_NODE_LABELS.style("opacity", _tv);
    });
    //  Map Appearance
    d3.select("#settings_show_contours").on("input", function() {
        toggleShowContours();
    });
    d3.select("#settings_reversecolor").on("click", function(e){
        toggleReverseColormap();
    });    
    d3.select("#settings_interpolation_type").on("input", function() {
        parms.SET("INTERPOLATE_NN", this.checked);
        if (!parms.GET("ENERGIZE")) renderer.updateScalarField(renderer.instance);
    });
    d3.select("#settings_embed_links").on("input", function() {
        parms.TOGGLE("EMBED_LINKS");
        if (!parms.GET("ENERGIZE")) {
            renderer.updateScalarField(renderer.instance);
        }
    });
    d3.select("#settings_show_tunnels").on("input", function () {
        toggleShowTunnels();
    });
    d3.select("#settings_shading").on("click", function(e){
        toggleShading();
    });        
    d3.select("#settings_dilation_degree").on("input", function() {
        let _tv = parseFloat(this.value);
        parms.SET("SCALARFIELD_DILATION_ITERS", _tv);
        if (!parms.GET("ENERGIZE")) {
            renderer.updateScalarField(renderer.instance);
        }
    });
    d3.select("#settings_range_min").on("input", function() {
        let _tv = parseFloat(this.value);
        setRANGE(renderer, "RANGE_MIN", _tv);
    });
    d3.select("#settings_range_max").on("input", function() {
        let _tv = parseFloat(this.value);
        setRANGE(renderer, "RANGE_MAX", _tv);
    });
    d3.select("#settings_contour_step").property("value", parms.GET("CONTOUR_STEP")).on("input", function() {
        parms.SET("CONTOUR_STEP", parseFloat(this.value));
        if (!parms.GET("ENERGIZE")) renderer.updateScalarField(renderer.instance);
    });
    d3.select("#settings_contour_big_step").on("input", function() {
        parms.SET("CONTOUR_BIG_STEP", parseFloat(this.value));
        if (!parms.GET("ENERGIZE")) renderer.updateScalarField(renderer.instance);
    });
    d3.select("#settings_indicator_size").on("input", function() {
        let _tv = this.value;    
        parms.SET("INDICATOR_FONTSIZE", _tv);
        if (renderer.SVG_INDICATOR_LABELS) renderer.SVG_INDICATOR_LABELS.style("font-size", _tv);
    });
    d3.select("#settings_height_scale").on("input", function() {
        let _tv = parseFloat(this.value);
        parms.SET("HEIGHT_SCALE", _tv);
        if (!parms.GET("ENERGIZE")) renderer.updateScalarField(renderer.instance);
    });
    d3.select("#settings_resolution").on("input", function() {
        let _tv = parseInt(this.value);
        parms.SET("SCALARFIELD_RESOLUTION", _tv);
        if (!parms.GET("ENERGIZE")) renderer.updateScalarField(renderer.instance);
    });
    d3.select("#settings_link_sample_step").on("input", function() {
        let _tv = parseInt(this.value);
        parms.SET("LINK_SAMPLE_STEPSIZE", _tv);
        if (!parms.GET("ENERGIZE")) renderer.updateScalarField(renderer.instance);
    });
    d3.select("#settings_underground_threshold").on("input", function() {
        let _tv = parseFloat(this.value);
        parms.SET("UNDERGROUND_THRESHOLD", _tv);
        if (!parms.GET("ENERGIZE")) renderer.updateScalarField(renderer.instance);
    });
    // Language
    d3.select("#btn_l_de").on("click", function (e) {
        Wswitch_locale('de');
    });
    d3.select("#btn_l_en").on("click", function (e) {
        Wswitch_locale('en');
    });
    d3.select("#btn_l_nl").on("click", function (e) {
        Wswitch_locale('nl');
    });

    d3.select("#settings_linkdist").on("input", function() {
        parms.SET("LINK_DISTANCE", parseInt(this.value));
    });

    // tickcount-Info
    d3.select("#btn_tcIreset").on("click", function (e) {
        setTickCountInfo(renderer.instance, 'min');
    });

}

function setRANGE(renderer, _RANGE, _tv) {
    parms.SET(_RANGE, _tv);
    renderer.setColorMap(renderer.instance);
    renderer.updateRange(renderer.instance);
    if (!parms.GET("ENERGIZE")) renderer.updateScalarField(renderer.instance);
}
//---------------------------------------------------------------------------

export function makeTickCountInfo(objRef, update=null, tciLevel=null, _nLength=null) {

    putTickCountInfo("#tcinfo_cnts", objRef.tickCounterTotal);

    if ( tciLevel ) {
        putTickCountInfo("#tClevel", tciLevel);
    }
    if ( _nLength ) {
        putTickCountInfo("#tcinfo_ncount", _nLength);
    }
    if ( update ) {
        putTickCountInfo("#tcinfo_level", objRef.tickCounterLevel);
        putTickCountInfo("#tcinfo_check", objRef.tickCounterLevelV);
        putTickCountInfo("#tcinfo_cycles", objRef.tickCounterCycles);
        putTickCountInfo("#tcinfo_modvalue", objRef.tickCounterControlValue);
    }

    let _theCanvas = objRef.CANVAS;
    if ( _theCanvas ) {
        _theCanvas = _theCanvas._groups[0][0];
        let _theTransform = _theCanvas.viewportElement.__zoom;
        let _k = 1.0;
        if ( _theTransform ) {
            putTickCountInfo("#trfinfo_x", _theTransform.x);
            putTickCountInfo("#trfinfo_y", _theTransform.y);
            _k = _theTransform.k;
            putTickCountInfo("#trfinfo_scale", _k);
        }
        let _tcBox = _theCanvas.getBBox();
        putTickCountInfo("#trfinfo_cw", ( _tcBox.width * _k ));
        putTickCountInfo("#trfinfo_ch", ( _tcBox.height * _k ));
    }
}

export function putTickCountInfo(_id, value) {
    let _theElem = d3.select(_id)._groups[0][0];
    _theElem.innerHTML = value;
}

function setTickCountInfo(objRef, _tLevel) {
    let _tCount = parms.getTickCount(_tLevel);
    objRef.tickCounterControlValue = _tCount.check;                       // set new value for modulo-ops
    objRef.tickCounterLevel = _tLevel;                                    // set new level
    objRef.tickCounterCycles = _tCount.cyc;                               // set new multiplyer
    objRef.tickCounterThreshold = _tCount.val * objRef.tickCounterCycles;   // set new threshold
    parms.SET("RENDERER_UPDATE_LEVEL", _tLevel);
    parms.SET("RENDER_UPDATE_INTERVAL", parms.getTickCount(_tCount.check));
}

//---------------------------------------------------------------------------

function initTooltip(objRef)
{
    if (parms.GET("SHOW_TOOLTIPS")) {
        if (!objRef.SVG_DRAGABLE_ELEMENTS ) {
            return;
        }
        objRef.SVG_DRAGABLE_ELEMENTS
            .on("mouseover", null)
            .on("mouseenter", null)
            .on("mousemove", null)
            .on("mouseout", null);
    }
    d3.select("#tooltip").remove(); // remove any previous elements
    d3.select("body").append("div").attr("id", "tooltip");
    registerTooltipEventhandler(objRef);
}

function registerTooltipEventhandler(objRef)
{
    if ( objRef == undefined) {
        let renderer = parms.oGET("RENDERER");
        objRef = renderer.instance;
        }
    if (parms.GET("SHOW_TOOLTIPS")) {
        let tooltip = d3.select("#tooltip");
        objRef.SVG_DRAGABLE_ELEMENTS
            .on("mouseover", function (node) {
                return tooltip.style("visibility", "visible");
            })
            .on("mouseenter", function (event, node) { // insert tooltip content
                let tooltipString = objRef.getNodeAttributesAsString(node);
                return tooltip.text(tooltipString);
            })
            .on("mousemove", function (event) { // adjust tooltip position
                return tooltip
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 15) + "px");
            })
            .on("mouseout", function () {
                return tooltip.style("visibility", "hidden");
            })
            ;
    } else {
        objRef.SVG_DRAGABLE_ELEMENTS
            .on("mouseover", null)
            .on("mouseenter", null)
            .on("mousemove", null)
            .on("mouseout", null)
            ;
        d3.select("#tooltip").style("visibility", "hidden");
    }
}

function inittooltipYV(objRef)
{
    if (parms.GET("SHOW_YEARVALUES")) {
        if (objRef.SVG_CONTOURS) {
            objRef.SVG_CONTOURS
            .on("mouseover", null)
            .on("mouseenter", null)
            .on("mousemove", null)
            .on("mouseout", null)
            ;
        }
    }
    d3.select("#tooltipYV").remove(); // remove any previous elements
    d3.select("body").append("div").attr("id", "tooltipYV");
    registertooltipYVeventhandler(objRef);
}

function registertooltipYVeventhandler(objRef)
{
    if ( objRef == undefined) {
        let renderer = parms.oGET("RENDERER");
        objRef = renderer.instance;
        }
    if (parms.GET("SHOW_YEARVALUES")) {
        let tooltip = d3.select("#tooltipYV");
        tooltip.style("visibility", "visible");
        if (objRef.SVG_CONTOURS) {
            objRef.SVG_CONTOURS
                .on("mouseover", function (c) {
                    // return tooltip.style("visibility", "visible");
                })
                .on("mouseenter", function (event, c) { // insert tooltip content
                    let tooltipString = c.value;
                    return tooltip.text(tooltipString);
                })
                .on("mousemove", function (event) { // adjust tooltip position
                    return tooltip
                        .style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 15) + "px");
                })
                .on("mouseout", function () {
                    // return tooltip.style("visibility", "hidden");
                })
                ;
        }
    } else {
        if (objRef.SVG_CONTOURS) {
            objRef.SVG_CONTOURS
                .on("mouseover", null)
                .on("mouseenter", null)
                .on("mousemove", null)
                .on("mouseout", null)
                ;
        }
        d3.select("#tooltipYV").style("visibility", "hidden");
    }
}

export function closeModalIDB()
{
    document.querySelector("#overlay").style.display = "none";
    let ovHTML = gui.FILE_MODAL();
    let OVelmnt = document.getElementById("overlay");
    OVelmnt.innerHTML = ovHTML;
}

export function showIDBstate() {
    let ovHTML = gui.IDB_INDEX();
    let OVelmnt = document.getElementById("overlay");
    OVelmnt.innerHTML = ovHTML;
    d3.select("#overlay").on("click", function(event) {
        closeModalIDB(event);
    });

    const _liHead = document.getElementById("idbstores");
    _liHead.innerHTML = "";
    let db;
    const mkeyList = new Map();
    const DB = new Promise((resolve, reject) => {
        const request = indexedDB.open("wtTAM");
        request.onsuccess = () => resolve(request.result);
    });
    const idbSlist = new Promise((resolve, reject) => {
        DB.then(idb => {
            db = idb;
            let dbos = idb.objectStoreNames;
            let _dbos = Array.from(dbos);
            resolve(_dbos);
        });
    });
    idbSlist.then(snames => {
            let _snames = snames;
                snames.forEach(sname => {
                    const liItem = document.createElement("li");
                    liItem.classList = 'ulli';
                    _liHead.appendChild(liItem);
                    const param = document.createElement("p");
                    param.innerHTML = sname;
                    liItem.appendChild(param);
                    const showButton = document.createElement('button');
                    liItem.appendChild(showButton);
                    showButton.innerHTML = '>';
                    showButton.title = 'Click to Show Items';
                    // here we are setting a data attribute on our show button to say what task we want shown if it is clicked!
                    showButton.setAttribute('key-task', sname);
                    showButton.onclick = function(event) {
                      showIDBkeys(event);
                    };
                    // liItem itself will do nothing
                    liItem.onclick = function(event) {
                        event.stopPropagation();
                    };
                });
                document.querySelector("#overlay").style.display = "inline";
        });
}

function showFromIDB(event) {
    let actNodeE = event.target;
    let dstring = event.target.getAttribute("show-task");
    event.stopPropagation();
    closeModalIDB();
    let dstrings = dstring.split("|");
    let dbName = "wtTAM";
    let dbStore = dstrings[0];
    let dbKey = dstrings[1];
    loadDataFromIDB(dbName, dbStore, dbKey);
}

export function showIDBkeys(event) {
    let actNodeE = event.target;
    let actNode = actNodeE.parentNode;
    let sname = event.target.getAttribute("key-task");
    event.stopPropagation();
    let db;
    const DB = new Promise((resolve, reject) => {
        const request = indexedDB.open("wtTAM");
        request.onsuccess = () => {
            db = request.result;
            showIDBkeysL(actNode, db, sname, actNodeE);
            resolve(db);
        };
    });
}

function showIDBkeysL(actNode, db, sname, actNodeE) {
    const DBtactn = new Promise((res, rej) => {
        let taction = db.transaction(sname, "readonly");
        let ostore = taction.objectStore(sname);
        let req = ostore.openCursor();

        let _keyList = [];
        req.onsuccess = function(e) {
            let curs = e.target.result;
            if (curs) {
                let _key = curs.primaryKey;
                _keyList.push(_key);
                curs.continue();
            } else {
                showIDBkeysLdo(actNode, sname, _keyList, actNodeE);
            }
        };
        req.oncomplete = (ev) => {
            res(_keyList);
        };
        req.onerror = (ev) => {
            rej(ev);
        };
    });
}

function showIDBkeysLdo(actNode, sname, keyList, actNodeE) {
    const oliHead = document.createElement("ol");
    if (keyList.length > 0) {
        keyList.forEach( idbKey => {
            const oliItem = document.createElement("li");
            // oliItem.innerHTML = ':';
            oliItem.classList = 'olli';
            oliHead.appendChild(oliItem);
            oliItem.title = 'Load from Store';
            const param = document.createElement("p");
            param.innerHTML = idbKey;
            oliItem.appendChild(param);
            // here we are setting a data attribute on our param to say what task we want done if it is clicked!
            param.setAttribute('show-task', sname+'|'+idbKey);
            param.onclick = function(event) {
                showFromIDB(event);
            };
            const delButton = document.createElement('button');
            oliItem.appendChild(delButton);
            delButton.innerHTML = 'E';
            delButton.title = 'Erase from Store';
            // here we are setting a data attribute on our del button to say what task we want done if it is clicked!
            delButton.setAttribute('del-task', sname+'|'+idbKey);
            delButton.onclick = function(event) {
                delIDBkey(event);
            };
        });
    } else {
        const param = document.createElement("p");
        // oliItem.innerHTML = ':';
        oliHead.appendChild(param);
        param.innerHTML = 'Number of entries in this Store: 0';
    }
    actNode.appendChild(oliHead);
    actNodeE.innerHTML = '';       // show button will be set inactiv
    actNodeE.onclick = function(event) {
        event.stopPropagation();
    };
}
