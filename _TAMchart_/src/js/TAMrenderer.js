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
// Basic Renderer
//
///////////////////////////////////////////////////////////////////////////////

import { createDownloadFromBlob, removeInternalValuesFromJSON, getParameters, getMetadata } from "./export.js";
// import { default as i18n } from "./i18n.js";
import { vec, brighten, darken, distance, jiggle, isNumber } from "./utils.js";
import * as parms from "./parms.js";
import { resetSVGLayers } from "./interfaces.js";
import { initInteractions, setTAMDragactions, makeTickCountInfo } from "./interaction.js";
import { TopoMap, NormalField, GradientField } from "./scalarfield.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var PARM_NODE_BORDER_COLOR_FIXED = "#ad0de2";

export function setRange(nodes, CurrentYear)
{
    let _rangeMin = 1e8;
    let _rangeMax = -1e8;

    nodes.forEach(node => 
    {
        // automatically adjust TAM height range to min and max values
        if (node.value)
        {
            let _nvalue = node.value;
            if ( _nvalue < 1500 ) {
                _nvalue = 1500;
            } else {
                if ( _nvalue > CurrentYear ) {
                _nvalue = CurrentYear;
                }
            }
            _rangeMin = Math.min(_rangeMin, _nvalue);
            _rangeMax = Math.max(_rangeMax, _nvalue);
            if ( node.valueD ) {
                _nvalue = node.valueD;
                if ( _nvalue < 1500 ) {
                    _nvalue = 1500;
                } else {
                    if ( _nvalue > CurrentYear ) {
                    _nvalue = CurrentYear;
                    }
                }
                    _rangeMax = Math.max(_rangeMax, _nvalue);
            }
        }
    });
    
    // Range-Hack: avoid too dark shades of blue
    let range = _rangeMax - _rangeMin;
    _rangeMin = Math.floor(_rangeMin - range / 7);
    _rangeMin -= (_rangeMin % 10);
    _rangeMax -= (_rangeMax % 10);
    _rangeMax += 10;

    parms.SET("RANGE_MAX", _rangeMax);
    parms.SET("RANGE_MIN", _rangeMin);
    d3.select("#settings_range_min").property("value", parms.GET("RANGE_MIN"));    
    d3.select("#settings_range_max").property("value", parms.GET("RANGE_MAX"));    
}



export class TAMRenderer
{
    constructor()
    {
        // Graphic Layers
        this.CANVAS = null;
        this.TOPO_LAYER = null;
        this.SHADING_LAYER = null;
        this.GRAPH_LAYER = null;
        this.BULLS_EYE = null;

        // SVG Elements
        this.SVG_NODE_CIRCLES = null;
        this.SVG_LINKS = null;
        this.SVG_NODE_LABELS = null;
        this.SVG_CONTOURS = null;
        this.SVG_SHADING_CONTOURS = null;
        this.SVG_INDICATOR_LABELS = null;
        this.SVG_LINKS_STREETS = null;
        this.SVG_LINKS_TUNNELS = null;
        this.SVG_TUNNEL_ENTRIES_1 = null;
        this.SVG_TUNNEL_ENTRIES_2 = null;

        this.SVG_DRAGABLE_ELEMENTS = null;
        this.SVG_COLORMAP = null;
        this.NODES_COLORMAP = null;
        
        // Data and Variables
        this.NODES = [];
        this.LINKS = [];
        this.tickCounter = 0;
        this.tickCounterTotal = 0;

        this.tickCounterLevel = 'min';
        this.tickCounterLevelV = 0;
        this.tickCounterCycles = 0;
        this.tickCounterControlValue = 0;
        this.tickCounterThreshold = 0;

        this.FORCE_SIMULATION = null;
        this.REPULSION_FORCE = null;
        this.LINK_FORCE = null;

        this.CurrentYear = new Date().getFullYear();

        this.instance = this;
        this.Htreed = 0;
        this.RENDERtype = 0;
        this.zoomO = null;

        this.svgKENN = 'TAM';

        this.isInitialized = false;
    }

    reset() {
        this.SVG_NODE_CIRCLES = null;
        this.SVG_LINKS = null;
        this.SVG_NODE_LABELS = null;
        this.SVG_CONTOURS = null;
        this.SVG_SHADING_CONTOURS = null;
        this.SVG_INDICATOR_LABELS = null;
        this.SVG_LINKS_STREETS = null;
        this.SVG_LINKS_TUNNELS = null;
        this.SVG_TUNNEL_ENTRIES_1 = null;
        this.SVG_TUNNEL_ENTRIES_2 = null;

        this.SVG_DRAGABLE_ELEMENTS = null;
        this.SVG_COLORMAP = null;
        this.NODES_COLORMAP = null;
    }

    get_sKENN() {
        return this.svgKENN;
    }

    set_tickCounter(objRef, NODES) {
        let tickParms = parms.testTickLevel(NODES.length);
        objRef.tickCounterLevel = tickParms.tLevelP;                    // startlevel -> 'XXL','XL' ...
        objRef.tickCounterLevelV = tickParms.tLevelV;                   // dazu Wert
        objRef.tickCounterControlValue = tickParms.tCount;              // corresponding value for modulo-ops
        objRef.tickCounterCycles = tickParms.tCycles;                   // multiplyer for calculating threshold value
        let _tCT = tickParms.tCycles * tickParms.tLevelV;
        objRef.tickCounterThreshold = _tCT;
        // "Tci_Xn_tCp": "TickCounter initialized: %{pNl} nodes  -> Level:%{pLl}, ControlValue:%{pCnt}, Cycles:%{pCyc}, Threshold:%{pTh}.",
        console.log(i18n("Tci_Xn_tCp", { pNl: NODES.length, pLl: tickParms.tLevelP, pCnt: tickParms.tCount, pCyc: tickParms.tCycles, pTh: _tCT } ));

        makeTickCountInfo(objRef, true, objRef.tickCounterLevel, NODES.length);
    }

    createForceGraphJSON(json)
    {
        let _rangeMin = 1e8;
        let _rangeMax = -1e8;

        // list nodes
        //--------------------------------------------------------------------

        var nodeMap = new Map();
        Object.values(json.nodes).forEach(node => 
        {
            console.log(node);

            node.r = parms.GET("NODE_RADIUS");
            if (node.value == 0)
                node.value = 0.001;

            if (node.fixed) { // restore fixed state
                node.fx = node.x;
                node.fy = node.y;
            }

            nodeMap.set(node.id, node);
            
            this.NODES.push(node);
        });
        
        setRange(this.NODES, this.CurrentYear);

        // list dependencies
        //--------------------------------------------------------------------
        Object.values(json.links).forEach(link => {
            var source = nodeMap.get(link.source);
            var target = nodeMap.get(link.target);

            if (source == undefined)
                // ("Source " + link.source + " is undefined!");
                console.log(i18n("LS_i_u", { pls: link.source } ));
            if (target == undefined)
                // ("Target " + link.target + " is undefined!");
                console.log(i18n("LT_i_u", { plt: link.target } ));
            
            if (source && target)
            {
                let _link = {"source": source, "target": target, "directed": link.directed, "distance": parms.GET("LINK_DISTANCE") };
                this.LINKS.push(_link);
            }
        });

        // ("Created Graph with " + this.NODES.length + " nodes and " + this.LINKS.length + " links.");
        console.log(i18n("C_Gw_Xn_Xl", { pNl: this.NODES.length, pLl: this.LINKS.length } ));

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        let objRef = this;

        // Set tick-frequency depending on NODES.length
        objRef.set_tickCounter(objRef, this.NODES);

        // FORCE SIMULATION OF FORCE-DIRECTED GRAPH

        objRef.REPULSION_FORCE = d3.forceManyBody().strength(-parms.GET("REPULSION_STRENGTH"));
        objRef.LINK_FORCE = d3.forceLink(objRef.LINKS).distance(function(d){ return d.distance; }).strength(parms.GET("LINK_STRENGTH"));

        objRef.FORCE_SIMULATION = d3.forceSimulation(objRef.NODES)
            .force("charge", objRef.REPULSION_FORCE)
            .force("x", d3.forceX(0).strength(parms.GET("GRAVITY_X"))) 
            .force("y", d3.forceY(0).strength(parms.GET("GRAVITY_Y"))) 
            .force("link", objRef.LINK_FORCE)
            .force("similarity", function(alpha){ objRef.similarityForce(objRef.NODES, alpha); })
            .force("collision", d3.forceCollide().radius(function(d){ return 3 * d.r; }))
            .velocityDecay(parms.GET("FRICTION"))        // friction since d3.v4
            .alpha(parms.GET("ALPHA"))
            .alphaDecay(0)
            .on("tick", function tick() { objRef.tick(objRef); })
            .on("end", function update() { objRef.updateScalarField(objRef); })
            ;

        if (!parms.GET("ENERGIZE")) // this parameter may be loaded from an exported save file
            objRef.FORCE_SIMULATION.alpha(0); // stop simulation

        // ("Force Graph Initialized.");
        console.log(i18n("F_G_I"));

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///  CREATE SVG ELEMENTS

        objRef.initSVGLayers(objRef);
        objRef.setColorMap(objRef);
        objRef.setNodeColors(objRef);

        objRef.SVG_LINKS = objRef.GRAPH_LAYER.selectAll(".link")
            .data(objRef.LINKS).enter()
            .append("line")
            .attr("stroke", parms.GET("LINK_COLOR"))
            .attr("stroke-width", parms.GET("LINK_WIDTH") + "px")
            .attr("opacity", parms.GET("SHOW_LINKS") ? parms.GET("LINK_OPACITY") : 0)
            .attr("marker-end",    function(link) { return link.directed ? "url(#arrowTAM)" : "none"; })
            ;

        objRef.SVG_NODE_CIRCLES = objRef.GRAPH_LAYER.selectAll(".nodes")
            .data(objRef.NODES).enter()
            .append("circle")
            .style("fill", function(node) { return typeof(node.value) == "number" ? objRef.SVG_COLORMAP(node.value) : "red"; })
            .style("stroke", "#222")
            .attr("stroke-width", (parms.GET("NODE_RADIUS") / 4) + "px")
            .attr("r", function(node) { return node.r; })
            //.attr("filter", "url(#dropshadowTAM)")
            ;

        if (parms.GET("SHOW_NAMES"))
            objRef.showNames();

        // ("SVG Elements Initialized.");
        console.log(i18n("SVG_E_i"));

        objRef.SVG_DRAGABLE_ELEMENTS = objRef.SVG_NODE_CIRCLES;

        if (!objRef.isInitialized) {
            initInteractions(objRef);
            objRef.isInitialized = true;
        }
        setTAMDragactions(objRef);
        this.adjustCanvas(objRef);
        // ("Interactions Initialized.");
        console.log(i18n("Int_i"));
    }


    initSVGLayers(objRef)
    {
        let sKenn = objRef.svgKENN;
        let cKenn = "#s" + sKenn;
        let the_canvas = d3.selectAll(cKenn);
        let the_svg_g = the_canvas.select("g");
        let _has_g = the_svg_g.node();
        if ( _has_g ) {
            objRef.CANVAS = the_svg_g;
            resetSVGLayers(objRef);
        } else {
            objRef.CANVAS = d3.select("#s" + sKenn).append("g");
        }
        objRef.TOPO_LAYER = objRef.CANVAS.append("g").attr("id", "topolayer" + sKenn);
        objRef.SHADING_LAYER = objRef.CANVAS.append("g").attr("id", "shadinglayer" + sKenn);
        objRef.GRAPH_LAYER = objRef.CANVAS.append("g").attr("id", "graphlayer" + sKenn);
    }


    similarityForce(nodes, alpha) 
    { 
        let _sfStrength = parms.GET("SF_STRENGTH");
        if (_sfStrength == 0)
            return;

        var target_slope = 20;    // a value difference of 1 should map to a unit distance of 10

        const VIRTUAL_LINK_STRENGTH = _sfStrength / Math.max(nodes.length,1);

        for (var i = 0, n = nodes.length; i < n; i++) 
        {
            var p = nodes[i];
            if (p.value == null)
                continue;

            for (var j = i + 1; j < n; j++)
            {
                var q = nodes[j];
                if (q.value == null)
                    continue;

                var v = new vec(q.x + q.vx - p.x - p.vx, q.y + q.vy - p.y - p.vy);    
                var len = v.norm();

                var dv = Math.abs(q.value - p.value);
                var target_len = dv * target_slope;

                var targetvec = v.mul( (len - target_len) / len );

                var F = targetvec.mul(VIRTUAL_LINK_STRENGTH * alpha);

                p.vx += F.x;
                p.vy += F.y;
                q.vx -= F.x;
                q.vy -= F.y;
            }
        }
    }

    adjustCanvas(objRef) {
        // let the_canvas = objRef.CANVAS;
        // let w = the_canvas._groups[0][0].lastChild.clientWidth;
        // let t = d3.zoomIdentity
        //         .translate(-2500, -1750)
        //         .scale(2, 2);
        // the_canvas            
        //     .transition()
        //     .call(objRef.zoomO.transform, t);
        // d3.zoomIdentity = t;
        return;
    }
    // }
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
                    makeTickCountInfo(objRef, true);
                }
            } else {
                this.tickCounterTotal += this.tickCounter;
                this.tickCounter = 0;
                makeTickCountInfo(objRef);
            }
        } else {
            if (this.tickCounter == 5) {
                // this.adjustCanvas(objRef);
            }
            return;
        }

        // move node circles to defined position (d.x,d.y)
        this.SVG_NODE_CIRCLES
            .style("stroke", function(p) { return p.fx == null ? "#222" : PARM_NODE_BORDER_COLOR_FIXED; })
            .attr("r", function(p) { return p.fx == null ? p.r : p.r * 1.5; })
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            ;

        // set links
        let _arrowDfactor = parms.GET("ARROW_DISTANCE_FACTOR");
        let _arrowRadius = parms.GET("ARROW_RADIUS");
        this.SVG_LINKS
            .attr("x1", function(d) { 
                //return d.source.x; 
                var l = distance(d.source, d.target), t = (l - d.source.r - _arrowDfactor * _arrowRadius) / l;
                var x = d.source.x * t + d.target.x * (1-t);
                return isNaN(x) ? d.source.x : x;
            })
            .attr("y1", function(d) { 
                //return d.source.y; 
                var l = distance(d.source, d.target), t = (l - d.source.r - _arrowDfactor * _arrowRadius) / l;
                var y = d.source.y * t + d.target.y * (1-t);
                return isNaN(y) ? d.source.y : y;
            })
            .attr("x2", function(d) { 
                //return d.target.x;
                var l = distance(d.source, d.target), t = (l - d.target.r - _arrowDfactor * _arrowRadius) / l;
                var x = d.source.x * (1-t) + d.target.x * t;
                return isNaN(x) ? d.target.x : x;
            })
            .attr("y2", function(d) { 
                //return d.target.y;
                var l = distance(d.source, d.target), t = (l - d.target.r - _arrowDfactor * _arrowRadius) / l;  
                var y = d.source.y * (1-t) + d.target.y * t;
                return isNaN(y) ? d.target.y : y;
            })
            ;

        // set labels
        if (parms.GET("SHOW_NAMES"))
            this.SVG_NODE_LABELS.attr("transform", this.placeLabel);
    }


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    showNames()
    {
        this.SVG_NODE_LABELS = this.GRAPH_LAYER.selectAll(".labels")
            .data(this.NODES).enter()
            .append("text")
            .text(function(node) { return node.name; })
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
        this.SVG_NODE_LABELS.each(function(node) { node.labelwidth = this.getComputedTextLength(); });

        // now adjust label position based on label lengths
        this.SVG_NODE_LABELS.attr("transform", this.placeLabel);
    }
    
    hideNames()
    {
        if (this.SVG_NODE_LABELS)  this.SVG_NODE_LABELS.remove();
    }

    placeLabel(node)
    {
        if (parms.GET("PERSON_LABELS_BELOW_NODE"))
        {
            // below the node
            let x = node.x - node.labelwidth * 0.5;
            let y = node.y + node.r + 1.0 * parms.GET("FONT_SIZE");
            return "translate(" + x + ", " + y + ")";
        }
        else
        {
            // right beside the node
            let x = node.x + 1.5 * node.r;
            let y = node.y + parms.GET("FONT_SIZE")/4;
            return "translate(" + x + ", " + y + ")";
        }
    }

    setContourColor(path) 
    {
        return darken(this.SVG_COLORMAP(path.value));
    }

    setContourWidth(path) 
    {
        return path.value % parms.GET("CONTOUR_BIG_STEP") ?  1 * parms.GET("CONTOUR_WIDTH")  :  4 * parms.GET("CONTOUR_WIDTH");
    }


    resetScalarField(objRef)
    {
        // remove old paths        
        if (objRef.SVG_CONTOURS) objRef.SVG_CONTOURS.remove();
        if (objRef.SVG_SHADING_CONTOURS) objRef.SVG_SHADING_CONTOURS.remove();
        if (objRef.SVG_LINKS_STREETS) objRef.SVG_LINKS_STREETS.remove();
        if (objRef.SVG_LINKS_TUNNELS) objRef.SVG_LINKS_TUNNELS.remove();
        if (objRef.SVG_TUNNEL_ENTRIES_1) objRef.SVG_TUNNEL_ENTRIES_1.remove();
        if (objRef.SVG_TUNNEL_ENTRIES_2) objRef.SVG_TUNNEL_ENTRIES_2.remove();
        if (objRef.SVG_INDICATOR_LABELS) objRef.SVG_INDICATOR_LABELS.remove();

        // make the original simple links visible again
        if (this.SVG_LINKS && parms.GET("SHOW_LINKS")) this.SVG_LINKS.attr("opacity", 1);  
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    resetColormap()
    {
        let renderer = parms.oGET("RENDERER");
        this.TOPO_LAYER.selectAll(".contours")
            .attr("fill", function(d) { return brighten(renderer.SVG_COLORMAP(d.value),0.05); })
            .attr("stroke", function(path) { return renderer.setContourColor(path); })
            .attr("stroke-width", function(path) { return renderer.setContourWidth(path); })
            ;
    }

    setColorMap(objRef) 
    {
        let renderer = parms.oGET("RENDERER");
        let _rangeMax = parms.GET("RANGE_MAX");
        let _rangeMin = parms.GET("RANGE_MIN");
        // var thresholds = d3.range(_rangeMin, _rangeMax, parms.GET("CONTOUR_STEP")); 
        if (parms.GET("REVERSE_COLORMAP")) {
            objRef.SVG_COLORMAP = d3.scaleDiverging(parms.oGET("COLORMAP")).domain([_rangeMin, (_rangeMax + _rangeMin) * 0.5, _rangeMax]);
        } else {
            objRef.SVG_COLORMAP = d3.scaleDiverging(parms.oGET("COLORMAP")).domain([_rangeMax, (_rangeMax + _rangeMin) * 0.5, _rangeMin]);
        }
    }

    setNodeColors(objRef) 
    {
        if (objRef.SVG_NODE_CIRCLES) {
            objRef.SVG_NODE_CIRCLES.style("fill", function(node) { return typeof(node.value) == "number" ? objRef.SVG_COLORMAP(node.value) : "red"; });
        }
    }

    updateRange(objRef)
    {
        // in case color ramp range changes
        if (objRef.SVG_NODE_CIRCLES) objRef.SVG_NODE_CIRCLES.style("fill", function(node) { return typeof(node.value) == "number" ? objRef.SVG_COLORMAP(node.value) : "red"; });
    }

    
    updateScalarField(objRef)
    {
        // remove old paths        
        objRef.resetScalarField(objRef);
        
        //--- 1. List height field constraints
        var topopoints = [];

        // add constraints at person positions
        objRef.NODES.forEach(p =>    {
            if (isNumber(p.value)) topopoints.push(p);
        });

        // Create Topopoints for links
        if (parms.GET("EMBED_LINKS"))
        {
            this.LINKS.forEach(link => {
                if (link.source.value && link.target.value) {
                    let pv0 = new vec(link.source.x, link.source.y, link.source.value);
                    let pv1 = new vec(link.target.x, link.target.y, link.target.value);
                    let v = pv1.sub(pv0);
                    let nsteps = v.norm() / parms.GET("LINK_SAMPLE_STEPSIZE");
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
            objRef.LINKS.forEach(link =>
            {
                if (link.source.value && link.target.value)
                {
                    // determine 2D start and endpoint on map, respecting some offsets
                    let pv0 = new vec(link.source.x, link.source.y, link.source.value);
                    let pv1 = new vec(link.target.x, link.target.y, link.target.value);

                    SEGMENTS.push({ 'pv0': pv0, 'pv1': pv1, 'directed': link.directed, 'r1': link.target.r });
                }
            });

            // create tunnels
            objRef.createTunnels(SCALARFIELD, SEGMENTS, objRef);

            if (objRef.SVG_NODE_CIRCLES) objRef.SVG_NODE_CIRCLES.raise();
            if (objRef.SVG_NODE_LABELS) objRef.SVG_NODE_LABELS.raise();
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
    
    
    createTunnels(SCALARFIELD, SEGMENTS)
    {
        // let renderer = parms.oGET("RENDERER");
        let INTERVALS = {'streets': [], 'tunnels': [] };

        //--- 1. List all Tunnel and Street intervals -------------------
        SEGMENTS.forEach(segment => 
        {
            //--- determine 2D start and endpoint on map, respecting some offsets
            let pv0 = segment.pv0;
            let pv1 = segment.pv1;
            let v = pv1.sub(pv0);
            if (v.x == 0 && v.y == 0) {
                v.x = jiggle();
                v.y = jiggle();
            }
            let d = Math.sqrt(v.x*v.x + v.y*v.y);
            let offset = Math.min( d / 2, segment.r1 + parms.GET("ARROW_DISTANCE_FACTOR") * parms.GET("ARROW_RADIUS"));
            v = v.mul(offset/d);
            //pv0 = pv0.add(v);    // only offset target where arrow is (directional)
            pv1 = pv1.sub(v);

            //--- now sample tunnel/street line intervals
            v = pv1.sub(pv0);
            if (!v.zero())
            {
                let nsteps = v.norm() / parms.GET("LINK_SAMPLE_STEPSIZE");
                if (nsteps == 0) return;
                v = v.div(nsteps);

                let _underground_Threshold = parms.GET("UNDERGROUND_THRESHOLD");
                let wasUnderground = SCALARFIELD.sampleBilinear(pv0.x, pv0.y) - pv0.z > _underground_Threshold;
                let currentInterval = [pv0, pv0, false];
                if (wasUnderground) 
                    INTERVALS.tunnels.push(currentInterval);
                else 
                    INTERVALS.streets.push(currentInterval);

                for (let i = 0, pv = pv0; i < nsteps; i++, pv = pv.add(v))
                {
                    let sfValue = SCALARFIELD.sampleBilinear(pv.x, pv.y);
                    let isUnderground = sfValue - pv.z > _underground_Threshold;

                    if (isUnderground && !wasUnderground)
                    {
                        let pvOffset = pv;//.sub(v.mul(2));
                        INTERVALS.streets[INTERVALS.streets.length - 1][1] = pvOffset;
                        INTERVALS.tunnels.push(currentInterval = [pvOffset, pv, false]);
                    }
                    else if (!isUnderground && wasUnderground)
                    {
                        let pvOffset = pv;//.add(v.mul(2));
                        INTERVALS.tunnels[INTERVALS.tunnels.length - 1][1] = pvOffset;
                        INTERVALS.streets.push(currentInterval = [pvOffset, pv, false]);
                    }
                    else
                        currentInterval[1] = pv;

                    wasUnderground = isUnderground;
                }

                // if the link is directed, mark the last interval to be and "end"-interval
                let last = wasUnderground ? INTERVALS.tunnels[INTERVALS.tunnels.length - 1] : INTERVALS.streets[INTERVALS.streets.length - 1];
                last[2] = segment.directed;
            }

        });
            
        //--- 2. Create SVG Elements ---------------------------------------------------------
        let _linkColor = parms.GET("LINK_COLOR");
        let _linkOpacity = parms.GET("LINK_OPACITY");
        let _linkWidth = parms.GET("LINK_WIDTH");
        let _showLinks = parms.GET("SHOW_LINKS");

        this.SVG_LINKS_STREETS = this.GRAPH_LAYER.selectAll(".link_street")
            .data(INTERVALS.streets).enter()
            .append("line")
            .attr("stroke", _linkColor)
            .attr("stroke-width", _linkWidth + "px")
            .attr("opacity", _showLinks ? _linkOpacity : 0)
            .attr("marker-end", interval => { return interval[2] ? "url(#arrowTAM)" : "none"; })
            .attr("x1", interval => { return interval[0].x; })
            .attr("y1", interval => { return interval[0].y; })
            .attr("x2", interval => { return interval[1].x; })
            .attr("y2", interval => { return interval[1].y; })
            ;

        this.SVG_LINKS_TUNNELS = this.GRAPH_LAYER.selectAll(".link_tunnel")
            .data(INTERVALS.tunnels).enter()
            .append("line")
            .attr("stroke", _linkColor)
            .attr("stroke-width", _linkWidth + "px")
            .attr("opacity", _showLinks ? _linkOpacity : 0)
            .attr("stroke-dasharray", "0 5 5 0")
            .attr("marker-end", interval => { return interval[2] ? "url(#arrowTAM)" : "none"; })
            .attr("x1", interval => { return interval[0].x; })
            .attr("y1", interval => { return interval[0].y; })
            .attr("x2", interval => { return interval[1].x; })
            .attr("y2", interval => { return interval[1].y; })
            ;

        this.SVG_TUNNEL_ENTRIES_1 = this.GRAPH_LAYER.selectAll(".tunnel_entries1")
            .data(INTERVALS.tunnels).enter()
            .append("polyline")
            .attr("fill", "none")
            .attr("stroke", _linkColor)
            .attr("stroke-width", _linkWidth + "px")
            .attr("opacity", tunnel => { return _showLinks && !tunnel[2] ? _linkOpacity : 0; })    // dont show entry at end where the marker is
            .attr("points", tunnel => { return this.placeTunnelEntry(tunnel, false); })
            ;

        this.SVG_TUNNEL_ENTRIES_2 = this.GRAPH_LAYER.selectAll(".tunnel_entries2")
            .data(INTERVALS.tunnels).enter()
            .append("polyline")
            .attr("fill", "none")
            .attr("stroke", _linkColor)
            .attr("stroke-width", _linkWidth + "px")
            .attr("opacity", parms.GET("SHOW_LINKS") ? _linkOpacity : 0 )
            .attr("points", tunnel => { return this.placeTunnelEntry(tunnel, true); })
            ;
    }
    
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    addHeightfieldOverlays(SCALARFIELD, objRef)
    {
        let _rangeMax = parms.GET("RANGE_MAX");
        let _rangeMin = parms.GET("RANGE_MIN");
        var thresholds = d3.range(_rangeMin, _rangeMax, parms.GET("CONTOUR_STEP")); 

        // ("Extracting Contours");
        console.log(i18n("Ext_C"));
        var paths = SCALARFIELD.getContourPaths(thresholds);
        var scalarFieldTransformProjection = d3.geoPath().projection( 
            d3.geoTransform({
                point: function(x, y) {
                    this.stream.point(x * SCALARFIELD.cellSize + SCALARFIELD.origin.x, y * SCALARFIELD.cellSize + SCALARFIELD.origin.y);
                }
            }) 
        );
            
        // add new paths
        // ("Adding Contours");
        console.log(i18n("Add_C"));

        objRef.SVG_CONTOURS = objRef.TOPO_LAYER.selectAll(".contours")
            .data(paths)
            .enter().append("path")
            .attr("class", "contours")
            .attr("stroke", function(path) { return objRef.setContourColor(path); })
            .attr("stroke-width", function(path) { return objRef.setContourWidth(path); })
            .attr("fill", function(d) { return brighten(objRef.SVG_COLORMAP(d.value), 0.08); })
            .attr("d", scalarFieldTransformProjection )
            ;

        // add heightfield indicators
        // ("Adding Height Indicators");
        console.log(i18n("Add_HI"));
        objRef.computeHeightFieldIndicators(SCALARFIELD, paths, objRef.SVG_COLORMAP, objRef);

        // add shading
        if (parms.GET("SHADING")) {
            // ("Computing Normal Field");
            console.log(i18n("Comp_NF"));
            var normalField = new NormalField(SCALARFIELD, 100 * parms.GET("HEIGHT_SCALE") / (_rangeMax - _rangeMin) );
            // ("Extracting Shading Contour Paths");
            console.log(i18n("Ext_SCP"));
            var shadingPaths = normalField.getShadingContourPaths(new vec(-0.5,-0.5,1).normalize());
            // ("Adding Shading Layer");
            console.log(i18n("Add_SL"));
            objRef.SVG_SHADING_CONTOURS = objRef.SHADING_LAYER.selectAll(".shadingContours")
                .data(shadingPaths)
                .enter().append("path")
                .attr("class","shadingContours")
                .attr("d", scalarFieldTransformProjection )
                .attr("fill", "rgb(253,253,254)")
                .style("mix-blend-mode", "multiply")
                .style("pointer-events", "none")
                ; 
        }
    }
    
    
    sampleIndicators(scalarfield, gradientField, p, dir, indicators) 
    {
        const stepSize = 1;
        const minDist = parms.GET("INDICATOR_FONTSIZE");

        let last_indicator = null;
        let gradient = new vec(1, 0);
        for (var i = 0; i < 5000; i++)
        {
            var value = scalarfield.sampleBilinear(p.x, p.y);
            if (isNaN(value))
                continue;

            // inter-heightfield value (fractional part within a contour line)
            let _contourStep = parms.GET("CONTOUR_STEP");
            let closest_contour_value = Math.floor(value / _contourStep) * _contourStep;
            let frac = value - closest_contour_value;
            if (frac >= _contourStep / 2)
                closest_contour_value += _contourStep;

            let contour_dist = Math.abs(value - closest_contour_value);
            if (contour_dist < parms.GET("INDICATOR_EPSILON")  && gradient && (!last_indicator || (last_indicator.value != closest_contour_value && distance(p, last_indicator) > minDist)))
            {
                last_indicator = {'x': p.x, 'y': p.y, 'value': closest_contour_value, 'gradient': gradient};
                indicators.push(last_indicator);
            }

            // continue sampling along the gradient
            let cell = scalarfield.map(p.x, p.y);
            gradient = gradientField.sampleBilinear(cell.x, cell.y);
            if (!gradient) 
                continue;
            
            if (gradient.norm() < stepSize * 0.001)
                return;        
            
            p = p.add(gradient.normalize().mul(dir * stepSize));
        }     
    }


    computeHeightFieldIndicators(scalarfield, paths, colormap, objRef)
    {
        let uvSeeds;
        
        if (parms.GET("MANY_SEEDS")) {
            uvSeeds = [
                new vec(0.2, 0.1), new vec(0.9, 0.2), new vec(0.8, 0.9), new vec(0.1, 0.8), new vec(0.5, 0.5),
                new vec(0.5, 0.1), new vec(0.1, 0.5), new vec(0.9, 0.5), new vec(0.5, 0.9),
            ];
        }
        else {
            //uvSeeds = [new vec(0.3, 0.2), new vec(0.8, 0.6), new vec(0.4, 0.8)];
            uvSeeds = [new vec(0.3, 0.2), new vec(0.2, 0.8), new vec(0.8, 0.2), new vec(0.8, 0.8)];
        }
        
        let indicators = [];
       
        let gradientField = new GradientField(scalarfield);
        
        // starting point
        uvSeeds.forEach(seed =>
        {
            let anchor = new vec(
                scalarfield.origin.x + seed.x * scalarfield.width * scalarfield.cellSize,
                scalarfield.origin.y + seed.y * scalarfield.height * scalarfield.cellSize
            );
            
            this.sampleIndicators(scalarfield, gradientField, anchor, 1, indicators);
            this.sampleIndicators(scalarfield, gradientField, anchor, -1, indicators);
        });
        
        
        // create SVG labels
        //----------------------------------------------------

        if (this.SVG_INDICATOR_LABELS)
            this.SVG_INDICATOR_LABELS.remove();

            this.SVG_INDICATOR_LABELS = objRef.TOPO_LAYER.selectAll(".indicator_labels")
            .data(indicators).enter()
            .append("text")
            .text(d => { return d.value.toFixed(1) / 1; })
            .style("fill", d => { return darken(colormap(d.value)); } )
            .style("font-family", "Arial")
            .style("font-size", parms.GET("INDICATOR_FONTSIZE"))
            .style("pointer-events", "none")  // to prevent mouseover/drag capture
            .attr("transform", this.placeIndicator)
            ;
    }
    
    
    placeIndicator(indicator) 
    {
        let _labelHeight = parms.GET("INDICATOR_FONTSIZE");
        let _labelWidth = _labelHeight * 4.5;

        let pos = vec.copy(indicator);
        pos.y += _labelHeight * 0.0;

        let transform = "translate(" + pos.x + ", " + pos.y + ") ";

        let v = new vec(indicator.gradient.y, -indicator.gradient.x).normalize();
        if (!isNaN(v.x) && !isNaN(v.y))
        {
            //if (v.x < 0) v = v.negate();
            //pos = pos.add(v.mul(-labelwidth / 2));
            //transform += "scale(1,-1) "

            let angle = Math.atan2(v.y, v.x) * 180 / Math.PI;
            transform = "translate(" + pos.x + ", " + pos.y + ")  rotate(" + angle + ")";

            if (v.x < 0)
                transform += "scale(-1,-1)  translate(" + (-_labelWidth/2) + ", " + (+_labelHeight/2) + ")";
        }
        return transform;
    }

        
    placeTunnelEntry(tunnel, invert)
    {
        let len = 6;
        let pv0 = tunnel[invert ? 0 : 1];
        let pv1 = tunnel[invert ? 1 : 0];

        let v = pv1.sub(pv0);
        v.z = 0;
        v = v.normalize();

        let w = v.mul(-len * 0.5);
        let n = new vec(v.y, -v.x).mul(len);

        let p0 = pv0.add(n);
        let p1 = p0.add(w).add(n);
        let q0 = pv0.sub(n);
        let q1 = q0.add(w).sub(n);
        
        return [ [p1.x, p1.y], [p0.x, p0.y], [q0.x, q0.y], [q1.x, q1.y] ];
    }
    
    
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
    toggleLinks(showLinks)
    {
        let _showTunnels = parms.GET("SHOW_TUNNELS");
        let _linkOpacity = parms.GET("LINK_OPACITY");
        let tunnelLinkOpacity = showLinks && _showTunnels ? _linkOpacity : 0;
        if (this.SVG_LINKS_STREETS) this.SVG_LINKS_STREETS.attr("opacity", tunnelLinkOpacity);
        if (this.SVG_LINKS_TUNNELS) this.SVG_LINKS_TUNNELS.attr("opacity", tunnelLinkOpacity);
        if (this.SVG_TUNNEL_ENTRIES_1) this.SVG_TUNNEL_ENTRIES_1.attr("opacity", tunnelLinkOpacity);
        if (this.SVG_TUNNEL_ENTRIES_2) this.SVG_TUNNEL_ENTRIES_2.attr("opacity", tunnelLinkOpacity);
        
        if (this.SVG_LINKS) this.SVG_LINKS.attr("opacity", showLinks && (parms.GET("ENERGIZE") || !_showTunnels) ? _linkOpacity : 0);
    }

    // Returns a string representation of the node to be used in tooltips
    getNodeAttributesAsString(node)
    {
        return node.name + (node.id ? " (" + node.id + ")" : "") +
                "\nValue: " + node.value;
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    saveDataF()
    {
        let nodePositions = [];
        this.NODES.forEach(node => {
            nodePositions.push({
                "id": node.id,
                "name": node.name,
                "value": node.value,
                "x": node.x,
                "y": node.y,
                "fixed": node.fx != null
            });
        });

        let content = [JSON.stringify(
            {
                "metadata": getMetadata(),
                "parameters": getParameters(),
                "nodes": nodePositions,
                "links": this.LINKS
            },
            removeInternalValuesFromJSON, 2)];
        let blob = new Blob(content, { type: "text/json" });
        let _fileName = parms.GET("FILENAME");
        let filenameWithoutSuffix = _fileName.slice(0, _fileName.lastIndexOf('.'));

        createDownloadFromBlob(blob, filenameWithoutSuffix + ".tam");
    }

    saveData()
    {
        return;
    }

}