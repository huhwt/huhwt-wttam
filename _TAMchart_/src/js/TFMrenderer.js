/*jshint -W014 */

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
// Gedcom Renderer
//
///////////////////////////////////////////////////////////////////////////////

import { createDownloadFromBlob, getParameters, getMetadata, dumpGRAPH } from "./export.js";
import { TAMRenderer, setRange } from "./TAMrenderer.js";
// import { default as i18n } from "./i18n.js";
import { vec, distance, isNumber, cleanDOM } from "./utils.js";
import { resetSVGLayers } from "./interfaces.js";
import { showSVG, initInteractions, setTAMDragactions, makeTickCountInfo } from "./interaction.js"; 
import * as parms from "./parms.js";
import { TopoMap, NormalField, GradientField } from "./scalarfield.js";
import { timestamp } from './utils.js';
import { putDB } from "./dbman.js";

// Parameters for Family Graph appearance
var PARM_RANGE_UNIT_LEN = 3;
var PARM_FAMILY_NODE_BORDER_COLOR = "#f88";
var PARM_FAMILY_NODE_BORDER_WIDTH = 10;
var PARM_FAMILY_FONT_SIZE = 16;
var PARM_FAMILY_NODE_OPACITY = 0.7;
var PARM_NODE_BORDER_COLOR_FIXED = "#ad0de2";

var PARM_LIFELINE_COLOR = "#e00";
var PARM_LIFELINE_WIDTHfac = 0.6;
var PARM_LIFELINE_WIDTH = 1;
var PARM_LIFELINE_OPACITY = 1;

var tfmObj = null;


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


export class TFMRenderer extends TAMRenderer
{
    constructor() 
    {
        super();

        this.GRAPH = null;

        this.PNODES = [];
        this.FNODES = [];
		this.LLNODES = [];
        this.FAMILYLINKS = [];

        this.SVG_FAMILY_CIRCLES = null;
        this.SVG_FAMILY_LABELS = null;
        this.SVG_LIFELINES = null;

        this.instance = this;
        tfmObj = this;
        this.RENDERtype = 1;

        this.svgKENN = 'TFM';
        this.SIMmode = 'TREE';

        this.isInitialized = false;

        this.GRAPH_DATA = null;
    }

    reset()
    {
        this.PNODES = [];
        this.FNODES = [];
		this.LLNODES = [];
        this.FAMILYLINKS = [];

        this.SVG_FAMILY_CIRCLES = null;
        this.SVG_FAMILY_LABELS = null;
    }

    load_GRAPH_DATA(text)
    {
        this.GRAPH_DATA = text;
    }

    createFamilyForceGraph(graph, nodePositions = null, lifelinePositions = null)
    {
        let objRef = this;
        objRef.GRAPH = graph;        // save graph data temporarily to enable lifeline toggling
        let LINKS = [];

        let _showLifelines = parms.GET("SHOW_LIFELINES");
        let _nodeRadius = parms.GET("NODE_RADIUS");
        PARM_LIFELINE_WIDTH = PARM_LIFELINE_WIDTHfac * _nodeRadius;

        // list persons
        //----------------------------------
        graph.persons.forEach(p =>
        {
            // set person data
            p.type = "PERSON";
            p.sr = 1;
            p.r0 = _nodeRadius;
            p.r = p.r0 * p.sr;
            p.cr = p.sex == parms.Sex.FEMALE ? p.r0 : 0;
            p.value = p.bdate ? p.bdate.getFullYear() : null;
            if ( p.value && p.value > this.CurrentYear) {
                p.value = this.CurrentYear;
            }

            p.valueD = p.ddate ? p.ddate.getFullYear() : null;

            // set node positions (if available)
            if (nodePositions && nodePositions[p.id])
            {
                p.x = nodePositions[p.id].x;
                p.y = nodePositions[p.id].y;
                p.vis = { 'x': p.x, 'y': p.y };
                if (nodePositions[p.id].fixed) { // restore fixed state
                    p.fx = p.x;
                    p.fy = p.y;
                }
            }
            else
                p.vis = {'x': 0, 'y': 0};

            objRef.PNODES.push(p);

            // if active, create lifeline nodes
            if (_showLifelines)
            {
                if (true && p.bdate && p.ddate)
                {
                    let startVal = p.bdate.getFullYear();
                    let endVal = p.ddate.getFullYear();

                    const segmentRange = 30;      // number of years per lifeline segment
                    p.lifeline = [p];
                    let val = startVal; 
                    do
                    {   let step = Math.min(segmentRange, endVal - val);
                        val += step;
                        
                        // initialize node with random location scattered around the person location
                        // -> leads to a smooth 'growing' appearance of lifelines if dynamically switched on
                        var node = { 'type': "LIFELINENODE", 'value': val, 
                                     'x': p.x + 3 * _nodeRadius * Math.random(),
                                     'y': p.y + 3 * _nodeRadius * Math.random()
                                    }; 
                        var link = { "source": p.lifeline.at(-1), "target": node, "distance": step * PARM_RANGE_UNIT_LEN };    // array.at(-1) retrieves last element in array
                        
                        p.lifeline.push(node);
                        this.LLNODES.push(node);
                        LINKS.push(link);
                    } 
                    while (val < endVal);

                    // apply saved lifeline positions, if available
                    if (lifelinePositions && lifelinePositions[p.id]) {
                        let llpos = lifelinePositions[p.id];
                        for (let i = 1; i < p.lifeline.length && i < llpos.length; i++) {
                            p.lifeline[i].x = llpos[i].x;
                            p.lifeline[i].y = llpos[i].y;
                        }
                    }
                }
            }
        });

        setRange(objRef.PNODES, objRef.CurrentYear);

        // list families
        //----------------------------------
        let _unknown = i18n("unknown");
        graph.families.forEach((f, key) =>
        {
            // add family
            f.id = key;
            f.type = "FAMILY";

            // set node positions (if available)
            if (nodePositions && nodePositions[key])
            {
                f.x = nodePositions[key].x;
                f.y = nodePositions[key].y;
                f.vis = { 'x': f.x, 'y': f.y };
                if (nodePositions[key].fixed) { // restore fixed state
                    f.fx = f.x;
                    f.fy = f.y;
                }
            }
            else
                f.vis = {'x': 0, 'y': 0};

            let _husb_surname = null;
            let _wife_surname = null;
            if ( f.husband ) {
                if (_husb_surname != _unknown)
                    _husb_surname = f.husband.surname;
            }
            if ( f.wife ) {
                if (_wife_surname != _unknown)
                    _wife_surname = f.wife.surname;
            }
            f.familyname = (f.husband && _husb_surname ? _husb_surname : (f.wife && _wife_surname ? _wife_surname : "")).toUpperCase();

            // Show correct surnames in single-child families (Suggestion Walter Hess)
            //{
            //    f.familyname = "";
            //    if (f.husband && f.husband.surname) f.familyname = f.husband.surname.toUpperCase();
            //    else if (f.children.length == 1)    f.familyname = f.children[0].surname.toUpperCase();
            //}
            
            
            // compute value of this node
            if (f.children.length == 0) {
                f.value = null;
                if (f.husband && f.husband.bdate) f.value = f.husband.bdate.getFullYear();
                if (f.wife && f.wife.bdate && f.wife.bdate.getFullYear() > f.value) f.value = f.wife.bdate.getFullYear();
            }
            else {
                f.value = 1e20;
                f.children.forEach(c => { if (c.bdate && c.bdate.getFullYear() < f.value) f.value = c.bdate.getFullYear(); });
            }
            if (!f.value || f.value === 1e20) {
                f.value = 0;
            }
            
            objRef.FNODES.push(f);
        });

        // link persons depending on ancestral graph appearance
        //-------------------------------------------------------------

        objRef.linkPersonsByFamilyNode(graph, LINKS, objRef);
        
        
        // Concat node links participating in force simulation in painter's order
        let NODES = objRef.FNODES.slice(0);
        objRef.LLNODES.forEach(n => NODES.push(n));
        objRef.PNODES.forEach(n => NODES.push(n));
        // let _PNODES = [];
        // this.PNODES.forEach(n => _PNODES.push(n));
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // FORCE SIMULATION OF FORCE-DIRECTED GRAPH

        objRef.REPULSION_FORCE = d3.forceManyBody().strength(-parms.GET("REPULSION_STRENGTH"));
        objRef.LINK_FORCE = d3.forceLink(LINKS).distance(function(d){ return d.distance; }).strength(parms.GET("LINK_STRENGTH"));

        // Set tick-frequency depending on NODES.length
        super.set_tickCounter(objRef, NODES);

        // Initialize force field at the end
        objRef.FORCE_SIMULATION = d3.forceSimulation(NODES)
            .force("charge", objRef.REPULSION_FORCE)
            .force("x", d3.forceX(0).strength(parms.GET("GRAVITY_X"))) 
            .force("y", d3.forceY(0).strength(parms.GET("GRAVITY_Y"))) 
            .force("similarity", function (alpha) { objRef.similarityForce(objRef.PNODES, alpha); })
            .force("collision", d3.forceCollide().radius(function(d){ return d.r; }))
            .force("link", objRef.LINK_FORCE)
            .velocityDecay(parms.GET("FRICTION"))
            .alpha(parms.GET("ALPHA"))
            // .alphaDecay(0)
            .alphaTarget(0.05)
            .on("tick", function tick() { objRef.tick(objRef); })
            .on("end", function update() { objRef.updateScalarField(objRef); })
            ;

        let _aT = objRef.FORCE_SIMULATION.alphaTarget();
        parms.SET("ALPHA_target", _aT);

        if (!parms.GET("ENERGIZE")) // this parameter may be loaded from an exported save file
            objRef.FORCE_SIMULATION.alpha(0); // stop simulation

        // ("Force Graph Initialized.");
        console.log(i18n("F_G_I"));

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///  CREATE SVG ELEMENTS

        super.initSVGLayers(objRef);
        super.setColorMap(objRef);
        super.setNodeColors(objRef);
        
        // bottom layer
        objRef.SVG_FAMILY_CIRCLES = objRef.GRAPH_LAYER.selectAll(".family")
            .data(objRef.FNODES).enter()
            .append("circle")
            .attr("class", "family")
            .style("fill", "fnodeColor")
            .style("stroke", PARM_FAMILY_NODE_BORDER_COLOR)
            .style("stroke-width", PARM_FAMILY_NODE_BORDER_WIDTH)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", PARM_FAMILY_NODE_OPACITY)
            .attr("r", function(f) { return f.r; })
            ;
        
        objRef.SVG_LINKS = objRef.GRAPH_LAYER.selectAll(".link")
            .data(objRef.FAMILYLINKS).enter()
            .append("line")
            .attr("stroke", parms.GET("LINK_COLOR"))
            .attr("stroke-width", parms.GET("LINK_WIDTH") + "px")
            .attr("opacity", parms.GET("SHOW_LINKS") ? parms.GET("LINK_OPACITY") : 0)
            .attr("marker-end","url(#arrow)")
            ;

        let _nr = _nodeRadius / 4;

        objRef.SVG_LIFELINES = objRef.GRAPH_LAYER.selectAll(".lifelines")
            .data(objRef.PNODES).enter()
            .append("polyline")
            .attr("fill","none")
            .attr("stroke", PARM_LIFELINE_COLOR)
            .attr("stroke-width", PARM_LIFELINE_WIDTH + "px")
            .attr("stroke-opacity", PARM_LIFELINE_OPACITY);

        objRef.SVG_NODE_CIRCLES = objRef.GRAPH_LAYER.selectAll(".person")
            .data(objRef.PNODES).enter()
            .append("rect")
            .attr("class", "person")
            .style("fill", function(node) { return typeof(node.value) == "number" ? objRef.SVG_COLORMAP(node.value) : "red"; })
            .style("stroke", "#222")
            .attr("stroke-width", _nr + "px")
            .attr("width", function (p) { return 2 * p.r; })
            .attr("height", function (p) { return 2 * p.r; })
            .attr("rx", function (p) { return p.cr; })
            .attr("ry", function (p) { return p.cr; })
            ;
        
        if (parms.GET("SHOW_NAMES"))
            objRef.showNames();

        // ("SVG Elements Initialized.");
        console.log(i18n("SVG_E_i"));
        console.log("GRAPH_LAVER",objRef.GRAPH_LAYER);

        // Setup interactions
        objRef.SVG_DRAGABLE_ELEMENTS = objRef.GRAPH_LAYER.selectAll(".family,.person");
        console.log("SVG_DRAGABLE_ELEMENTS",objRef.SVG_DRAGABLE_ELEMENTS);
        if (!objRef.isInitialized) {
            initInteractions(objRef);
            objRef.isInitialized = true;
        }
        setTAMDragactions(objRef);
        this.adjustCanvas(objRef);
        // ("Interactions Initialized.");
        console.log(i18n("Int_i"));

        showSVG(objRef);
    }

    initSVGLayers(objRef)
    {
        super.initSVGLayers(objRef);
    //     let sKenn = objRef.svgKENN;
    //     let the_canvas = d3.selectAll("#s" + sKenn);
    //     let the_svg_g = the_canvas.select("g");
    //     let _has_g = the_svg_g.node();
    //     if ( _has_g ) {
    //         objRef.CANVAS = the_svg_g;
    //         resetSVGLayers(objRef);
    //     } else {
    //         objRef.CANVAS = d3.select("#s" + sKenn).append("g");
    //     }
    //     objRef.TOPO_LAYER = objRef.CANVAS.append("g").attr("id", "topolayer" + sKenn);
    //     objRef.SHADING_LAYER = objRef.CANVAS.append("g").attr("id", "shadinglayer" + sKenn);
    //     objRef.GRAPH_LAYER = objRef.CANVAS.append("g").attr("id", "graphlayer" + sKenn);
    // // objRef.BULLS_EYE = objRef.CANVAS.select("#bullseye").append("g");
    }
    
    similarityForce(nodes, alpha) 
    {
        super.similarityForce(nodes, alpha);
    }


    linkPersonsByFamilyNode(graph, LINKS, objRef)
    {
        //-- link family nodes with children and compute family node radius
        let _nodeRadius = parms.GET("NODE_RADIUS");
        let _linkDistance = parms.GET("LINK_DISTANCE");
        graph.families.forEach(f =>
        {
            const familyDefaultRadius = Math.max(2.5 * _nodeRadius, Math.sqrt(f.children.length * 9 * _nodeRadius * _nodeRadius));
            f.r = familyDefaultRadius;

            f.children.forEach(c => 
            {
                // determine distance of child from family center for visualization of age differences
                c.fnodedist = familyDefaultRadius * 0.5;
                if (c.bdate) c.fnodedist += (c.bdate.getFullYear() - f.value) * PARM_RANGE_UNIT_LEN;

                // family circle radius has to encompass all childs
                f.r = Math.max(f.r, c.fnodedist);
                
                let link = { "source": f, "target": c, "distance": _linkDistance / 2 };    // division by 2 since there are two segments between family nodes
                LINKS.push(link);

                c.parentFamily = f;
            });
        });

        //-- link family node with parents
        graph.families.forEach(f => 
        {
            let sources = [];
            if (f.husband) sources.push(f.husband);
            if (f.wife) sources.push(f.wife);
            sources.forEach(source => 
            {
                let link = { "source": source, "target": f, "distance": _linkDistance * 0.8 + f.r };
                LINKS.push(link);
                objRef.FAMILYLINKS.push(link);
            });
        });
    }


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    tick(objRef)
    {
        // only update visualization each N iterations for performance
        if ((this.tickCounter++) % this.tickCounterControlValue == 0) {
            if ( this.tickCounterLevel != 'min' ) {
                if (this.tickCounter > this.tickCounterThreshold) {                 // check threshold
                    let _tLevel = parms.TClevel_down(this.tickCounterLevel);        // get next level
                    let _tCount = parms.getTickCount(_tLevel);
                    this.tickCounterControlValue = _tCount.check;                       // set new value for modulo-ops
                    this.tickCounterLevel = _tLevel;                                    // set new level
                    this.tickCounterCycles = _tCount.cyc;                               // set new multiplyer
                    this.tickCounterThreshold = _tCount.val * this.tickCounterCycles;   // set new threshold
                    parms.SET("RENDERER_UPDATE_LEVEL", _tLevel);
                    parms.SET("RENDER_UPDATE_INTERVAL", parms.getTickCount(_tCount.check));
                    this.tickCounterTotal += this.tickCounter;
                    this.tickCounter = 0;
                    makeTickCountInfo(this.instance, true);
                }
            } else {
                this.tickCounterTotal += this.tickCounter;
                this.tickCounter = 0;
                makeTickCountInfo(this.instance);
            }
        } else {
            if (this.tickCounter == 5) {
                this.adjustCanvas(objRef);
            }
            return;
        }

        
        // set visualization positions of persons by pushing them back into their parent family circle
        this.SVG_NODE_CIRCLES.each(p =>
        {
            // set visualization position to simulation position by default
            p.vis.x = p.x;
            p.vis.y = p.y;

            if (p.parentFamily) 
            {
                if (p.parentFamily.children.length == 1)
                {
                    p.vis.x = p.parentFamily.x;
                    p.vis.y = p.parentFamily.y;
                }
                else
                {
                    let dist = distance(p.vis, p.parentFamily);    // actual distance between node vis positions
                    if (dist > p.fnodedist){
                        let fac = (dist - p.fnodedist) / dist;
                        p.vis.x += (p.parentFamily.x - p.vis.x) * fac;
                        p.vis.y += (p.parentFamily.y - p.vis.y) * fac;
                    }
                }
            }
        });
        
        this.SVG_FAMILY_CIRCLES.each(f => {
            f.vis.x = f.x; 
            f.vis.y = f.y;
        });

            
        // move family and persons circles to defined position (d.x,d.y)
        // EW.H mod ... check for Htreed-Status     
        //      = 0: no Htree in progress
        //        > 0: Htreed Person fixed, set special shape
        //        < 0: Htreed Person released, reset to regular shape
        if (this.Htreed == 0) {
            this.SVG_NODE_CIRCLES
                .style("stroke", function(p) { return p.fx == null ? "#222" : PARM_NODE_BORDER_COLOR_FIXED; })
                .attr("x", function (p) { return p.vis.x - p.r; })
                .attr("y", function (p) { return p.vis.y - p.r; })
                ;
        } else {
            if (this.Htreed > 0) {
                this.SVG_NODE_CIRCLES
                    .style("stroke", function(p) { return p.fx == null ? "#222" : PARM_NODE_BORDER_COLOR_FIXED; })
                    .style("fill", function(p) { return p.fx == null ? objRef.SVG_COLORMAP(p.value) : "orange"; })
                    .attr("width", function (p) { return 2 * p.r * p.sr; })
                    .attr("height", function (p) { return 2 * p.r * p.sr; })
                    .attr("rx", function (p) { return p.cr * p.sr; })
                    .attr("ry", function (p) { return p.cr * p.sr; })
                    .attr("x", function (p) { return p.vis.x - p.r; })
                    .attr("y", function (p) { return p.vis.y - p.r; })
                    ;
            } else {
                this.Htreed = 0;
                this.SVG_NODE_CIRCLES
                    .style("stroke", function(p) { return p.fx == null ? "#222" : PARM_NODE_BORDER_COLOR_FIXED; })
                    .style("fill", function(p) { return p.fx == null ? objRef.SVG_COLORMAP(p.value) : "orange"; })
                    .attr("width", function (p) { return 2 * p.r * p.sr; })
                    .attr("height", function (p) { return 2 * p.r * p.sr; })
                    .attr("rx", function (p) { return p.cr * p.sr; })
                    .attr("ry", function (p) { return p.cr * p.sr; })
                    .attr("x", function (p) { return p.vis.x - p.r; })
                    .attr("y", function (p) { return p.vis.y - p.r; })
                    ;
            }
        }
        this.SVG_FAMILY_CIRCLES
            .style("stroke", function(f) { return f.fx == null ? PARM_FAMILY_NODE_BORDER_COLOR : PARM_NODE_BORDER_COLOR_FIXED; })
            .attr("cx", function(f) { return f.vis.x; })
            .attr("cy", function(f) { return f.vis.y; })
            .attr("r", function(f) { return f.r; })
            ;
        
            
        // set links
        let _arrowDfactor = parms.GET("ARROW_DISTANCE_FACTOR");
        let _arrowRadius = parms.GET("ARROW_RADIUS");
        this.SVG_LINKS
            .attr("x1", function(d) { return d.source.vis.x; })
            .attr("y1", function(d) { return d.source.vis.y; })
            .attr("x2", function(d) { 
                //if (d.target.type != "FAMILY") return d.targete.x;
                let l = distance(d.source.vis, d.target.vis), t = (l - d.target.r - _arrowDfactor * _arrowRadius) / l;
                let x = d.source.vis.x * (1-t) + d.target.vis.x * t;
                return isNaN(x) ? d.target.vis.x : x;
            })
            .attr("y2", function(d) { 
                //if (d.target.type != "FAMILY") return d.target.y;
                let l = distance(d.source.vis, d.target.vis), t = (l - d.target.r - _arrowDfactor * _arrowRadius) / l;  
                let y = d.source.vis.y * (1-t) + d.target.vis.y * t;
                return isNaN(y) ? d.target.vis.y : y;
            })
            ;
        
        // update lifeline points
        if (this.SVG_LIFELINES)
        {	
            this.SVG_LIFELINES.attr('points', function(p) {
                var path = [];    
                if (p.lifeline) 
                {
                    // smooth the simulation points of the curve to avoid bends
                    for (var i = 1; i < p.lifeline.length-1; i++) {  
                        p.lifeline[i].x = p.lifeline[i].x * 0.2 + (p.lifeline[i-1].x + p.lifeline[i+1].x) * 0.4;
                        p.lifeline[i].y = p.lifeline[i].y * 0.2 + (p.lifeline[i-1].y + p.lifeline[i+1].y) * 0.4;
                    }
                    
                    // define visualized lifeline path
                    path.push([p.vis.x, p.vis.y]);  // first lifeline node is the person itself -> anchor at its .vis position
                    for (let i = 1; i < p.lifeline.length; i++)
                        path.push([ p.lifeline[i].x, p.lifeline[i].y ]);
                }
                return path;
            });
        }
        // set labels
        if (parms.GET("SHOW_NAMES"))
        {
            this.SVG_NODE_LABELS.attr("transform", this.placeLabelP);
            this.SVG_FAMILY_LABELS.attr("transform", this.placeLabel);
        }

        objRef.showALPHA(objRef);

    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    hideNames()
    {
        this.SVG_FAMILY_LABELS.remove();
        this.SVG_NODE_LABELS.remove();
    }

    showNames()
    {
        // person labels
        //-----------------------------------------------------------------
        this.SVG_NODE_LABELS = this.GRAPH_LAYER.selectAll(".personlabels")
            .data(this.PNODES).enter()
            .append("text")
            .text(function(node) { return node.givenname; })
            .style("fill", parms.GET("LABEL_COLOR"))
            .style("stroke", "white")
            .style("stroke-width", parms.GET("FONT_SIZE") / 5)
            .style("paint-order", "stroke")
            .style("font-family", "Calibri")
            .style("font-size", parms.GET("FONT_SIZE"))
            .style("pointer-events", "none")  // to prevent mouseover/drag capture
            .style("opacity", parms.GET("PERSON_LABEL_OPACITY"))
            ;
            
        // compute label lengths and store them
        this.SVG_NODE_LABELS.each(function(d) { d.labelwidth = this.getComputedTextLength(); });
        // now adjust label position based on label lengths
        this.SVG_NODE_LABELS.attr("transform", this.placeLabelP);

        
        // family labels
        //-----------------------------------------------------------------
        this.SVG_FAMILY_LABELS = this.GRAPH_LAYER.selectAll(".familylabels")
            .data(this.FNODES).enter()
            .append("text")
            .text(function(d) { return d.familyname; })
            .style("fill", "black")
            .style("stroke", "white")
            .style("stroke-width", PARM_FAMILY_FONT_SIZE / 5)
            .style("paint-order", "stroke")
            .style("opacity", PARM_FAMILY_NODE_OPACITY)
            .style("font-family", "Calibri")
            .style("font-size", PARM_FAMILY_FONT_SIZE)
            .style("pointer-events", "none")  // to prevent mouseover/drag capture
            ;
            
        // compute label lengths and store them
        this.SVG_FAMILY_LABELS.each(function(d) { d.labelwidth = this.getComputedTextLength(); });
        // now adjust label position based on label lengths
        this.SVG_FAMILY_LABELS.attr("transform", this.placeLabel);
    }


    placeLabelP(node)
    {

        // lifeline present (only for person nodes) and sufficiently long
        if (node.lifeline && node.lifeline.length > 1)
        {
            // find actually visible path and its mid length
            let len = 0;
            let path = [node.vis];
            let dists = [0];
            for (var i = 1; i < node.lifeline.length; i++) {
                path.push(node.lifeline[i]);
                dists.push( distance(path.at(-2), path.at(-1)) );
                len += dists.at(-1);
            }
            len *= 0.5;
            
            for (let i = 1; i < path.length; i++)
            {
                if (dists[i] > len)
                {
                    // align label with this segment
                    let x0 = vec.copy(path[i-1]);
                    let x1 = vec.copy(path[i]);
                    let v = x1.sub(x0).div(dists[i]);    // if dists[i] is zero, len wouldn't fall in this segment 
                    
                    // center position
                    let pos = x0.add(v.mul(len));

                    // angle
                    if (v.x < 0) v = v.negate();
                    let n = new vec(v.y, -v.x);
                    let angle = Math.atan2(v.y, v.x) * 57.3;       // 180/pi. atan2 is quite expensive in JS

                    pos = pos.add(v.mul(-node.labelwidth * 0.5)).add(n.mul(PARM_LIFELINE_WIDTH));
                                
                    return "translate(" + pos.x + ", " + pos.y + ")  rotate(" + angle + ")";
                }
                len -= dists[i];
            }
        } else {
            if (parms.GET("PERSON_LABELS_BELOW_NODE"))
            {
                // below the node
                let x = node.vis.x - node.labelwidth * 0.5;
                let y = node.vis.y + node.r + 1.0 * parms.GET("FONT_SIZE");
                return "translate(" + x + ", " + y + ")";
            }
            else
            {
                // right beside the node
                let x = node.vis.x + 1.5 * node.r;
                let y = node.vis.y + parms.GET("FONT_SIZE")/4;
                return "translate(" + x + ", " + y + ")";
            }
        }
         
    }

    placeLabel(node)
    {
        if (parms.GET("PERSON_LABELS_BELOW_NODE"))
        {
            // below the node
            let x = node.vis.x - node.labelwidth * 0.5;
            let y = node.vis.y + node.r + 1.0 * parms.GET("FONT_SIZE");
            return "translate(" + x + ", " + y + ")";
        }
        else
        {
            // right beside the node
            let x = node.vis.x + 1.5 * node.r;
            let y = node.vis.y + parms.GET("FONT_SIZE")/4;
            return "translate(" + x + ", " + y + ")";
        }
    }

    // Update function for scalar field and associated contour map
    updateScalarField(objRef)
    {
        // remove old paths        
        objRef.resetScalarField(objRef);
        
        //--- 1. List height field constraints
        let topopoints = [];
        let _link_sample_stepsize = parms.GET("LINK_SAMPLE_STEPSIZE");

        // add constraints at person positions
        this.PNODES.forEach(p =>    {
            if (isNumber(p.value)) topopoints.push({ 'x' : p.vis.x, 'y': p.vis.y, 'value' : p.value });
            if (isNumber(p.valueD)) topopoints.push({ 'x' : p.vis.x, 'y': p.vis.y, 'value' : p.valueD });
            // if present, create topopoints for lifelines
            if (p.lifeline) 
            {
                // Note: p.lifeline[0] does not equal its visualized starting point, but the simulation point of the person
                let path = p.lifeline.slice(0);
                path[0].x = p.vis.x;
                path[0].y = p.vis.y;

                for (let j = 0; j < path.length-1; j++) 
                {
                    let pv0 = new vec(path[j].x, path[j].y, path[j].value);
                    let pv1 = new vec(path[j+1].x, path[j+1].y, path[j+1].value);
                    let v = pv1.sub(pv0);
                    let nsteps = v.norm() / _link_sample_stepsize;
                    if (nsteps > 0) {
                        v = v.div(nsteps);
                        for (let i = 0, pv = pv0; i < nsteps; i++, pv = pv.add(v))
                            topopoints.push({ 'x' : pv.x, 'y': pv.y, 'value' : pv.z });
                    }
                }
            }
        });
            
        // Create Topopoints for Family Links
        if (parms.GET("EMBED_LINKS"))
        {
            objRef.FAMILYLINKS.forEach(link => {
                if (link.source.value && link.target.value) {
                    let pv0 = new vec(link.source.vis.x, link.source.vis.y, link.source.value);
                    let pv1 = new vec(link.target.vis.x, link.target.vis.y, link.target.value);
                    let v = pv1.sub(pv0);
                    let nsteps = v.norm() / _link_sample_stepsize;
                    if (nsteps > 0) {
                        v = v.div(nsteps);
                        for (let i = 0, pv = pv0; i < nsteps; i++, pv = pv.add(v))
                            topopoints.push({ 'x' : pv.x, 'y': pv.y, 'value' : pv.z });
                    }
                }
            });
        }

        //--- 2. Create scalar field
        // (topopoints.length, " Topopoints");
        console.log(i18n("Top_l", { ptpl: topopoints.length } ));
        var SCALARFIELD = new TopoMap(topopoints, parms.GET("SF_INTERPOLATION_TYPE"), parms.GET("SCALARFIELD_RESOLUTION"), parms.GET("SCALARFIELD_DILATION_ITERS"));

        //--- 3. Create tunnels and overlays
        if (parms.GET("SHOW_TUNNELS"))
        {
            // ("Creating Tunnels");
            console.log(i18n("Cre_T"));
            objRef.SVG_LINKS.attr("opacity", 0);  // make the other links invisible

            let SEGMENTS = [];
            objRef.FAMILYLINKS.forEach(link =>
            {
                if (link.source.value && link.target.value)
                {
                    // determine 2D start and endpoint on map, respecting some offsets
                    let pv0 = new vec(link.source.vis.x, link.source.vis.y, link.source.value);
                    let pv1 = new vec(link.target.vis.x, link.target.vis.y, link.target.value);
                
                    SEGMENTS.push({ 'pv0': pv0, 'pv1': pv1, 'directed': true, 'r1': link.target.r });
                }
            });
            
            // create tunnels
            objRef.createTunnels(SCALARFIELD, SEGMENTS);

            if (objRef.SVG_NODE_CIRCLES) objRef.SVG_NODE_CIRCLES.raise();    
            //if (this.SVG_FAMILY_CIRCLES) this.SVG_FAMILY_CIRCLES.raise();    // needs to stay below links
            if (objRef.SVG_NODE_LABELS) objRef.SVG_NODE_LABELS.raise();
            if (objRef.SVG_FAMILY_LABELS) objRef.SVG_FAMILY_LABELS.raise();
        }
        else
        {
            objRef.SVG_LINKS_STREETS.attr("opacity", 0);
            objRef.SVG_LINKS_TUNNELS.attr("opacity", 0);
            objRef.SVG_TUNNEL_ENTRIES_1.attr("opacity", 0);
            objRef.SVG_TUNNEL_ENTRIES_2.attr("opacity", 0);
            objRef.SVG_LINKS.attr("opacity", parms.GET("SHOW_LINKS") ? parms.GET("LINK_OPACITY") : 0)
                          .attr("stroke-width", parms.GET("LINK_WIDTH") + "px")
                          ;
        }


        objRef.addHeightfieldOverlays(SCALARFIELD, objRef);
    
        // ("+++ Done Updating ScalarField");
        console.log(i18n("Done_uSF"));
    }

    // Returns a string representation of the node to be used in tooltips
    getNodeAttributesAsString(node)
    {
        function snotes(node) {
            let _snotes = '';
            if (node.snotes.length > 0) {
                for(let i=0; i < node.snotes.length; i++) {
                    if (node.snotes[i]) {
                        let _t = node.snotes[i];
                        _snotes += "\n - " + _t + " -";
                    }
                }
            }
            return _snotes;
        }

        let _unknown = i18n("unknown");
        if (node.type == "PERSON")
        {
            const age = node.bdate && node.ddate
                ? Math.floor((node.ddate - node.bdate) / 31536000000) // 1000ms * 60s * 60min * 24h * 365d
                : _unknown;
            const mother = node.getMother();
            const father = node.getFather();
            let _snotes = node.snotes ? snotes(node) : '';

            return node.getFullName() + (node.id ? " (" + node.id + ")" : "")
                    + "\n\n" + i18n("birth") + (node.bdate ? node.bdate.toLocaleDateString() : _unknown)
                    + "\n" + i18n("death") + (node.ddate ? node.ddate.toLocaleDateString() : _unknown)
                    + "\n" + i18n("age") + age
                    + "\n" + i18n("mother") + (mother ? mother.getFullName() + " (" +  mother.id + ")" : _unknown)
                    + "\n" + i18n("father") + (father ? father.getFullName() + " (" +  father.id + ")" : _unknown)
                    + _snotes
                    ;
        }
        else if (node.type == "FAMILY")
        {
            const wife = node.wife;
            const husband = node.husband;
            const mdate = node.mdate;
            let _snotes = node.snotes ? snotes(node) : '';

            return node.familyname + (node.id ? " (" + node.id + ")" : "")
                    + "\n\n" + i18n("wife") + (wife ? wife.getFullName() + " (" + wife.id + ")" : _unknown)
                    + "\n" + i18n("husband") + (husband ? husband.getFullName() + " (" + husband.id + ")" : _unknown)
                    + "\n" + i18n("marriage") + (mdate ? node.mdate.toLocaleDateString() : _unknown)
                    + "\n" + i18n("children") + (node.children ? node.children.length : _unknown)
                    + "\n" + i18n("Fchild") + (node.value ? node.value : _unknown)
                    + _snotes
                    ;
        }
        else
        {
            return _unknown;
        }
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    makeNodePositions()
    {
        // store person/family node positions with their id
        let nodePositions = {};
        this.PNODES.forEach(p => { nodePositions[p.id] = {"x": p.x, "y": p.y, "fixed": p.fx != null}; });
        this.FNODES.forEach(f => { nodePositions[f.id] = {"x": f.x, "y": f.y, "fixed": f.fx != null}; });

        return nodePositions;

    }
    makeNodeLifelines() {
        let lifelinePositions = {};
        this.PNODES.forEach(p => { 
            if (p.lifeline) {
                var llnodes = [];
                p.lifeline.forEach(ll => { llnodes.push({"x": ll.x, "y": ll.y }); });
                lifelinePositions[p.id] = llnodes;
            }
        });

        return lifelinePositions;
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    saveDataF()
    {
        // store person/family node positions with their id
        let nodePositions = this.makeNodePositions();
        let lifelinePositions = this.makeNodeLifelines();

        let content = [JSON.stringify(
            {
                "metadata": getMetadata(),
                "parameters": getParameters(),
                "nodePositions": nodePositions,
                "lifelinePositions": lifelinePositions,
                "nodeData": this.GRAPH_DATA
            },
            null, 2)]; // no replacement function, human readable indentation
        let blob = new Blob(content, { type: "text/json" });
        let _fileName = parms.GET("FILENAME");
        let _tfilename = document.getElementById("filename");
        if (_tfilename) { _fileName = _tfilename.value; }
        let filenameWithoutSuffix = _fileName;
        if (_fileName.indexOf('.') >= 0)
            filenameWithoutSuffix = _fileName.slice(0, _fileName.lastIndexOf('.'));

        createDownloadFromBlob(blob, filenameWithoutSuffix + ".tfm");

    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    saveData()
    {
        let nodePositions = this.makeNodePositions();
        let lifelinePositions = this.makeNodeLifelines();

        let _d = this.PNODES[0];
        let _primID = _d.id;
        let _primName = _d.givenname + '/' + _d.surname + '/';
        let _fileName = parms.GET("FILENAME");
        let _tfilename = document.getElementById("filename");
        if (_tfilename) { _fileName = _tfilename.value; }
        let idb_key = _primName + "-" + _primID;
        if (_fileName) { idb_key = _fileName; }
        let dataset = 
            {   "TFMdata": [
                    {
                        "storeID": idb_key,
                        "primID": _primID,
                        "timestamp": timestamp(),
                        "metadata": getMetadata(' - TFM'),
                        "parameters": getParameters(),
                        "nodePositions": nodePositions,
                        "lifelinePositions": lifelinePositions,
                        "nodeData": this.GRAPH_DATA
                    }
                ]
            };
        putDB("wtTAM","TFMdata", dataset.TFMdata);
    
    }
}
