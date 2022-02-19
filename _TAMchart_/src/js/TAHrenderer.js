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
// H-Tree Renderer
//
///////////////////////////////////////////////////////////////////////////////

import { createDownloadFromBlob, getParameters, getMetadata, dumpGRAPH } from "./export.js";
import { TAMRenderer, setRange } from "./TAMrenderer.js";
// import { default as i18n } from "./i18n.js";
import { vec, distance, isNumber } from "./utils.js";
import { initInteractions, setTAMDragactions, makeTickCountInfo } from "./interaction.js";
import * as parms from "./parms.js";
import { TopoMap, NormalField, GradientField } from "./scalarfield.js";
import { timestamp } from './utils.js';
import { putDB } from "./dbman.js";

// Parameters for Family Graph appearance
var PARM_RANGE_UNIT_LEN = 3;
var PARM_NODE_BORDER_COLOR_FIXED = "#741B47";
var PARM_FAMILY_NODE_BORDER_COLOR = "#f88";
var PARM_FAMILY_NODE_BORDER_WIDTH = 10;
var PARM_FAMILY_FONT_SIZE = 16;
var PARM_FAMILY_NODE_OPACITY = 0.7;


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


export class TAHRenderer extends TAMRenderer
{
    constructor() 
    {
        super();

        this.PNODES = [];
        this.FNODES = [];
        this.LINKNODES = [];
        this.FAMILYLINKS = [];

        this.SVG_FAMILY_CIRCLES = null;
        this.SVG_FAMILY_LABELS = null;

        let _parms = parms.GETall();

        this.instance = this;
        this.RENDERtype = 2;

        this.svgKENN = 'TAM';

        this.isInitialized = false;

        this.GRAPH_DATA = null;

        // this.COLORMAP = d3.scaleSequential(d3.interpolateRainbow);
        this.NODES_COLORMAP = null;
    }

    createPersonForceGraph(dataset)
    {
        let objRef = this;

        let _colordim = parms.H_gen;

        // list persons
        //----------------------------------
        let _rangeMin = 1e8;
        let _rangeMax = -1e8;

        // list nodes
        //--------------------------------------------------------------------

        var nodeMap = new Map();
        Object.values(dataset.nodes).forEach(node => 
        {
            console.log(node);

            if (node.fixed) { // restore fixed state
                node.fx = node.x;
                node.fy = node.y;
            }

            let _i_color = node.gen;
            if ( _i_color > _colordim ) { _i_color = _colordim; }
            node.icol = _i_color;

            nodeMap.set(node.id, node);

            this.NODES.push(node);
        });

        setRange(objRef.NODES, objRef.CurrentYear);

        // link persons depending on ancestral graph appearance
        //-------------------------------------------------------------

        Object.values(dataset.links).forEach(link => {
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
            .alpha(0)
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

        super.initSVGLayers(objRef);
        super.setColorMap(objRef);
        this.setNodeColors(objRef);

        objRef.SVG_LINKS = objRef.GRAPH_LAYER.selectAll(".link")
            .data(objRef.LINKS).enter()
            .append("line")
            .attr("stroke", parms.GET("LINK_COLOR"))
            .attr("stroke-width", parms.GET("LINK_WIDTH") + "px")
            .attr("opacity", parms.GET("SHOW_LINKS") ? parms.GET("LINK_OPACITY") : 0)
            .attr("marker-end", function(link) { return link.directed ? "url(#arrowTAM)" : "none"; })
            ;

        let _nr = parms.GET("NODE_RADIUS") / 4;
        objRef.SVG_NODE_CIRCLES = objRef.GRAPH_LAYER.selectAll(".nodes")
            .data(objRef.NODES).enter()
            .append("rect")
            // .attr("class", "person")
            .style("fill", function(node) { return objRef.NODES_COLORMAP(node.icol); })
            .style("stroke", function(node) { return objRef.NODES_COLORMAP(node.icol); })
            .attr("stroke-width", _nr + "px")
            .attr("width", function (f) { return 2 * f.r; })
            .attr("height", function (f) { return 2 * f.r; })
            .attr("rx", function (f) { return f.cr; })
            .attr("ry", function (f) { return f.cr; })
            .attr("x", function (f) { return f.x; })
            .attr("y", function (f) { return f.y; })
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
        let the_canvas = d3.selectAll("#sTAM");
        let the_svg_g = the_canvas.select("g");
        let _has_g = the_svg_g.node();
        if ( _has_g ) {
            objRef.CANVAS = the_svg_g;
        } else {
            objRef.CANVAS = d3.select("#sTAM").append("g");
        }
        objRef.TOPO_LAYER = objRef.CANVAS.append("g").attr("id", "topolayer");
        objRef.SHADING_LAYER = objRef.CANVAS.append("g").attr("id", "shadinglayer");
        objRef.GRAPH_LAYER = objRef.CANVAS.append("g").attr("id", "graphlayer");
        // objRef.BULLS_EYE = objRef.CANVAS.select("#bullseye").append("g");
    }
    
    setNodeColors(objRef) 
    {
        objRef.NODES_COLORMAP = d3.scaleSequential()
                                  .interpolator(d3.interpolateHslLong("orange","purple"))
                                  .domain([0, parms.H_gen])
                                  ;
    }

    similarityForce(nodes, alpha) 
    {
        super.similarityForce(nodes, alpha);
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

        // move node circles to defined position (d.x,d.y)
        this.SVG_NODE_CIRCLES
            .style("stroke", function(p) { 
                                let _pcol =  objRef.NODES_COLORMAP(p.icol);
                                return p.fx == null ? "#222" : _pcol; })
            .attr("r", function(p) { return p.fx == null ? p.r : p.r * 1.5; })
            .attr("x", function(d) { return d.x - d.r; })
            .attr("y", function(d) { return d.y - d.r; })
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
        {
            this.SVG_NODE_LABELS.attr("transform", this.placeLabel);
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    hideNames()
    {
        this.SVG_NODE_LABELS.remove();
    }

    showNames()
    {
        // person labels - 2 lines:  1. givenname   2. surname and other stuff
        //-----------------------------------------------------------------
        this.SVG_NODE_LABELS = this.GRAPH_LAYER.selectAll(".personlabels")
            .data(this.NODES).enter()
            .append("text")
            .style("text-anchor", "middle")
            .style("fill", parms.GET("LABEL_COLOR"))
            .style("stroke", "white")
            .style("stroke-width", parms.GET("FONT_SIZE") / 5)
            .style("paint-order", "stroke")
            .style("font-family", "Calibri")
            .style("font-size", parms.GET("FONT_SIZE"))
            .style("pointer-events", "none")  // to prevent mouseover/drag capture
            .style("opacity", parms.GET("PERSON_LABEL_OPACITY"))
            ;
        this.SVG_NODE_LABELS.each(function(){
            d3.select(this).append("tspan")
                           .attr("x", 0)
                           .attr("dy", 0)
                           .text(function(node) {return node.gname;}
                           );
            d3.select(this).append("tspan")
                           .attr("x", 0)
                           .attr("dy", "1.0em")
                           .text(function(node) { 
                                    let _text = '/' + node.sname + '/ ' + node.id + ' (K-' + node.kek +')';
                                    return _text; }
                            );
        });

        // compute label lengths and store them
        this.SVG_NODE_LABELS.each(function(d) { d.labelwidth = this.getComputedTextLength(); });
        // now adjust label position based on label lengths
        this.SVG_NODE_LABELS.attr("transform", this.placeLabel);

    }

    placeLabel(node)
    {
        if (parms.GET("PERSON_LABELS_BELOW_NODE"))
        {
            // below the node
            let x = node.x;
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

    // Update function for scalar field and associated contour map
    updateScalarField(objRef)
    {
        super.updateScalarField(objRef);
    }

    // Returns a string representation of the node to be used in tooltips
    getNodeAttributesAsString(node)
    {
        let _unknown = i18n("unknown");
        const age = node.bdate && node.ddate
            ? Math.floor((node.ddate - node.bdate) / 31536000000) // 1000ms * 60s * 60min * 24h * 365d
            : _unknown;
        // const mother = node.getMother();
        // const father = node.getFather();

        return node.name + (node.id ? " (" + node.id + ")" : "")
                + "\n\n" + i18n("gen") + node.gen
                + "\n" + i18n("birth") + (node.bdate ? node.bdate.toLocaleDateString() : _unknown)
                + "\n" + i18n("death") + (node.ddate ? node.ddate.toLocaleDateString() : _unknown)
                + "\n" + i18n("age") + age
                // + "\n" + i18n("mother") + (mother ? mother.getFullName() + " (" +  mother.id + ")" : _unknown)
                // + "\n" + i18n("father") + (father ? father.getFullName() + " (" +  father.id + ")" : _unknown)
                ;
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    saveDataF()
    {
        // store person/family node positions with their id
        let nodePositions = {};
        this.PNODES.forEach(p => { nodePositions[p.id] = {"x": p.x, "y": p.y, "fixed": p.fx != null}; });
        this.FNODES.forEach(f => { nodePositions[f.id] = {"x": f.x, "y": f.y, "fixed": f.fx != null}; });

        let content = [JSON.stringify(
            {
                "metadata": getMetadata(),
                "parameters": getParameters(),
                "nodePositions": nodePositions,
                "nodeData": this.GRAPH_DATA
            },
            null, 2)]; // no replacement function, human readable indentation
        let blob = new Blob(content, { type: "text/json" });
        let _fileName = parms.GET("FILENAME");
        let filenameWithoutSuffix = _fileName.slice(0, _fileName.lastIndexOf('.'));

        createDownloadFromBlob(blob, filenameWithoutSuffix + ".tfm");

    }

    saveData()
    {
        let _primName = d.givenname + '/' + d.surname + '/';
        let idb_key = _primName + "-" + _primID;
        let dataset = 
            {   "TFMdata": [
                    {
                        "storeID": idb_key,
                        "primID": _primID,
                        "timestamp": timestamp(),
                        "metadata": getMetadata(' - TFM'),
                        "parameters": getParameters(),
                        "nodePositions": nodePositions,
                        "nodeData": this.GRAPH_DATA
                    }
                ]
            };
        putDB("wtTAM","TFMdata", dataset.H_tree);
    
    }
}
