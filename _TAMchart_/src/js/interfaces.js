///////////////////////////////////////////////////////////////////////////////
//
// File open functionality added by Idefix2020
//
// i18n functionality added by huhwt
// Web storage functionality added by huhwt
// 
// Interface Management - Imports
//
///////////////////////////////////////////////////////////////////////////////

import { setParameters } from "./export.js";
import { TAMRenderer } from "./TAMrenderer.js";
import { TFMRenderer } from "./TFMrenderer.js";
import { TAHRenderer } from "./TAHrenderer.js";
import { loadGedcom, estimateMissingDates, processGedcom } from "./gedcom.js";
// import { default as i18n } from "./i18n.js";
import * as parms from "./parms.js";
import { showSVG, set_tamDefaultParameters } from "./interaction.js";
import { getDB, readFromDB } from "./dbman.js";
import { getBaseURL, getBaseREF } from "./utils.js";

let tfmNodePositions = null;

const RENDERtype = {
    "TAMrenderer": 0,
    "TFMrenderer": 1,
    "TAHrenderer": 2
};

export function resetSVGLayers(renderer)
{
    let sSuff = renderer.get_sKENN();
    let sKENN = "#s" + sSuff;

    d3.select("#topolayer" + sSuff).remove();
    d3.select("#shadinglayer" + sSuff).remove();
    d3.select("#graphlayer" + sSuff).remove();
    try {
    d3.select("#bullseye").remove();
    } catch (error) {

    }
}


function readSingleFile(e)
{
    let file = e.target.files[0];
    if (!file)
        return;
    
    let act_parms = parms.GETall();

    let reader = new FileReader();
    let renderer = parms.oGET("RENDERER");
    let _rendertype = renderer.RENDERtype;
    let isTFMRenderer = (_rendertype == RENDERtype.TFMrenderer);
    let renderer_new = false;
    if (renderer) {
        let objRef = renderer.instance;
        if ( objRef.SVG_DRAGABLE_ELEMENTS ) {
            objRef.SVG_DRAGABLE_ELEMENTS
                .on("mouseover", null)
                .on("mouseenter", null)
                .on("mousemove", null)
                .on("mouseout", null)
                ;
        }
    }

    let folder = parms.GET("SOURCE_FOLDER");
    if (folder == null) {
        folder = "data";
        parms.SET("SOURCE_FOLDER", folder);
    }
    reader.onload = function (e, reader) {
        var url = e.target.result;
        parms.SET("FILENAME", file.name);
        parms.SET("FILE_FOLDER", folder);

        if (renderer) {
            renderer.FORCE_SIMULATION.stop();
            showSVG(renderer, false);
            resetSVGLayers(renderer);
        }

        if (file.name.endsWith(".json") || file.name.endsWith(".tam")) {
            if (_rendertype !== RENDERtype.TAMrenderer) {
                renderer = new TAMRenderer();
                renderer_new = true;
                parms.oSET("RENDERER", renderer);
            } else {
                renderer.NODES = [];
                renderer.LINKS = [];
            }
    
            d3.json(url)
                .then(
                    function (json) { 
                        processJSON(json, file.name); 
                    });
            renderer.tickCounterTotal = 0;
            renderer.tickCounterCycles = 5;
    }
        else if (file.name.endsWith(".ged")) {

            if (_rendertype !== RENDERtype.TFMrenderer) {
                renderer = new TFMRenderer();
                renderer_new = true;
                parms.oSET("RENDERER", renderer);
            } else {
                let objRef = renderer.instance;
                resetTFM(objRef);
            }
            set_tamDefaultParameters();
            parms.SET("SOURCE_FILE", file.name);

            loadGedcom(folder + "/" + file.name,
                function (gedcom, text) {
                    estimateMissingDates(gedcom, parms.GET("PROCREATION_AGE"));
                    renderer.load_GRAPH_DATA(text);
                    renderer.createFamilyForceGraph(gedcom);
                    renderer.tickCounterTotal = 0;
                    renderer.tickCounterCycles = 5;
                });
        }
        else if (file.name.endsWith(".tfm")) {

            if (_rendertype !== RENDERtype.TFMrenderer) {
                renderer = new TFMRenderer();
                renderer_new = true;
                parms.oSET("RENDERER", renderer);
            } else {
                let objRef = renderer.instance;
                resetTFM(renderer);
            }

            d3.json(folder + "/" + file.name)
                .then(
                    function (json) { 
                        processTFM(json, folder); 
                    });
            renderer.tickCounterTotal = 0;
            renderer.tickCounterCycles = 5;
        }
        else
            console.error(i18n("U_f_t"));               // "Unrecognized file type"
    };
    reader.readAsDataURL(file);
}

// Reset TFMrenderer
function resetTFM(objRef) {
    objRef.resetScalarField(objRef);
    if (objRef.SVG_NODE_CIRCLES)  objRef.SVG_NODE_CIRCLES.remove();
    if (objRef.SVG_DNODE_CIRCLES)  objRef.SVG_DNODE_CIRCLES.remove();
    if (objRef.SVG_LINKS)  objRef.SVG_LINKS.remove();
    if (objRef.SVG_NODE_LABELS)  objRef.SVG_NODE_LABELS.remove();
    if (objRef.SVG_DRAGABLE_ELEMENTS)  objRef.SVG_DRAGABLE_ELEMENTS.remove();
    objRef.NODES = [];
    objRef.LINKS = [];
    objRef.PNODES = [];
    objRef.FNODES = [];
    objRef.LINKNODES = [];
    objRef.FAMILYLINKS = [];
}

///////////////////////////////////////////////////////////////////////////////

// Wrapper by rp
export function onChangeFile(event)
{
    var fileinput = document.getElementById("browse");
    var textinput = document.getElementById("filename");
    textinput.value = fileinput.files[0].name;

    readSingleFile(event);
}
// EW.H MOD - ... we want to load the content anyway, even when file has not changed ...
export function onClickFile(event)
{
    var fileinput = document.getElementById("browse");
    fileinput.value = null;         // this will force onChangeFile
}

///////////////////////////////////////////////////////////////////////////////


// load data, choose renderer based on the filetype and create force graph
export function loadFileFromDisk(folder)
{
    parms.SET("SOURCE_FOLDER", folder);
    let _fileName = parms.GET("FILENAME");
    parms.SET("SOURCE_FILE", _fileName);
    let renderer = parms.oGET("RENDERER");
    if (renderer) {
        showSVG(renderer, false);
        let objRef = renderer.instance;
        objRef.SVG_DRAGABLE_ELEMENTS
            .on("mouseover", null)
            .on("mouseenter", null)
            .on("mousemove", null)
            .on("mouseout", null)
            ;
    } else {
        renderer = new TFMRenderer();
    }
    let _rendertype = renderer.RENDERtype;
    let isTFMRenderer = renderer instanceof TFMRenderer;
    let renderer_new = false;
    let _state = parms.GET("STATE");

    if ((_fileName).endsWith(".json") || _fileName.endsWith(".tam"))
    {
        if (_rendertype !== RENDERtype.TAMrenderer) {
            renderer = new TAMRenderer();
            renderer_new = true;
            parms.oSET("RENDERER", renderer);
        }

        d3.json(folder + "/" + _fileName).then(
            function(json) { 
                processJSON(json, _fileName); 
                renderer.tickCounterTotal = 0;
                renderer.tickCounterCycles = 5;
            });
    }
    else if (_fileName.endsWith(".ged"))
    {
        if (_rendertype !== RENDERtype.TFMrenderer) {
            renderer = new TFMRenderer();
            renderer_new = true;
            parms.oSET("RENDERER", renderer);
        }

        set_tamDefaultParameters();
        loadGedcom(folder + "/" + _fileName,
            function(gedcom, text) {
                let _states = parms.GETall();
                estimateMissingDates(gedcom, parms.GET("PROCREATION_AGE"));
                renderer.load_GRAPH_DATA(text);
                renderer.createFamilyForceGraph(gedcom);
                renderer.tickCounterTotal = 0;
                renderer.tickCounterCycles = 5;
            }
        );
    }
    else if (_fileName.endsWith(".tfm"))
    {
        if (_rendertype !== RENDERtype.TFMrenderer) {
            renderer = new TFMRenderer();
            renderer_new = true;
            parms.oSET("RENDERER", renderer);
        }

        d3.json(folder + "/" + _fileName)
            .then(
                function(json) {
                    processTFM(json, folder);
                }
            );
    }
    else {
        console.error(i18n("U_f_t"));                   // Unrecognized file type
    }
}

// load data from indexedDB, choose renderer based on store-name and create force graph
export function loadDataFromIDB(dbName, storeName, key) {
    // if ( key == null )
    //     return;
    let renderer = parms.oGET("RENDERER");
    if (renderer) {
        showSVG(renderer, false);
        let objRef = renderer.instance;
        objRef.SVG_DRAGABLE_ELEMENTS
            .on("mouseover", null)
            .on("mouseenter", null)
            .on("mousemove", null)
            .on("mouseout", null)
            ;
        renderer.FORCE_SIMULATION.stop();
        renderer.reset();
        resetSVGLayers(renderer);
        renderer = null;
    }

    if ( storeName == "H-Tree")
    {
        renderer = new TAHRenderer();
        parms.oSET("RENDERER", renderer);

        const dbaction = readFromDB(dbName, storeName, key);
        dbaction.then( value => { 
                        console.log(value);
                        let content = [JSON.stringify(
                            {
                                "metadata": value.metadata,
                                "parameters": value.parameters,
                                "nodes": value.nodes,
                                "links": value.links
                            },
                            null, 2)];
                        processIDBH(value);
                        renderer.tickCounterTotal = 0;
                        renderer.tickCounterCycles = 5;
                     } )
                .catch(err => { console.log(err); } )
                ;
        return;
    }

    if ( storeName == "TFMdata")
    {
        renderer = new TFMRenderer();
        parms.oSET("RENDERER", renderer);

        const dbaction = readFromDB(dbName, storeName, key);
        dbaction.then( value => { 
                        console.log(value);
                        let content = [JSON.stringify(
                            {
                                "metadata": value.metadata,
                                "parameters": value.parameters,
                                "nodePositions": value.nodePositions,
                                "nodeData": value.nodeData
                            },
                            null, 2)];
                        processIDBtfm(value);
                        renderer.tickCounterTotal = 0;
                        renderer.tickCounterCycles = 5;
                     } )
                .catch(err => { console.log(err); } )
                ;
        return;
    }

    if ( storeName == "Gedcom")
    {
        renderer = new TFMRenderer();
        parms.oSET("RENDERER", renderer);

        const dbaction = readFromDB(dbName, storeName, key);
        dbaction.then( value => { 
                        console.log(value);
                        processIDBgedcom(value);
                        renderer.tickCounterTotal = 0;
                        renderer.tickCounterCycles = 5;
                     } )
                .catch(err => { console.log(err); } )
                ;
        return;
    }

}

// Process JSON loaded from a .json or .tam,
// then create graph.
function processJSON(json, filename)
{
    if ("parameters" in json) {
        console.log(i18n("L_pf_f"));                   // Loading parameters from file.
        setParameters(json.parameters);
    }
    else {
        console.log(i18n("F_dnc_p"));                   // File does not contain parameters
        set_tamDefaultParameters();
    }
    parms.SET("SOURCE_FILE", filename);
    let renderer = parms.oGET("RENDERER");
    renderer.createForceGraphJSON(json);
}

function processIDBH(dataset)
{
    if ("parameters" in dataset) {
        console.log(i18n("L_pf_f"));                   // Loading parameters from file.
        setParameters(dataset.parameters);
    }
    else {
        console.log(i18n("F_dnc_p"));                   // File does not contain parameters
        set_tamDefaultParameters();
    }
    let renderer = parms.oGET("RENDERER");
    let objRef = renderer.instance;
    renderer.reset();
    renderer.initSVGLayers(objRef);
    renderer.createPersonForceGraph(dataset);
}

function processIDBtfm(dataset)
{
    if ("parameters" in dataset) {
        console.log(i18n("L_pf_f"));                   // Loading parameters from file.
        setParameters(dataset.parameters);
    }
    else {
        console.log(i18n("F_dnc_p"));                   // File does not contain parameters
        set_tamDefaultParameters();
    }
    let gedcom = dataset.nodeData;
    let ds_infodata = dataset.infoData;
    if (ds_infodata) {
        if ( ds_infodata.length == 0)
            ds_infodata = null;
    } else {
        ds_infodata = null;
    }
    processFILENAME(dataset.storeID);
    processGedcom(gedcom, ds_infodata, function(gedcom, text) {
        estimateMissingDates(gedcom, parms.GET("PROCREATION_AGE"));
        let renderer = parms.oGET("RENDERER");
        let objRef = renderer.instance;
        renderer.reset();
        renderer.load_GRAPH_DATA(text);
        renderer.initSVGLayers(objRef);
        renderer.createFamilyForceGraph(gedcom, dataset.nodePositions);
    });
}

function processIDBgedcom(dataset)
{
    if ("parameters" in dataset) {
        console.log(i18n("L_pf_f"));                   // Loading parameters from file.
        setParameters(dataset.parameters);
    }
    else {
        console.log(i18n("F_dnc_p"));                   // File does not contain parameters
        set_tamDefaultParameters();
    }
    let ds_text = dataset.nodeData;
    let ds_infodata = dataset.infoData;
    if ( ds_infodata.length == 0) {
        ds_infodata = null;
    }
    let dsname = processFILENAME(dataset.dsname);
    processGedcom(ds_text, ds_infodata, function(ds_text, text) {
        estimateMissingDates(ds_text, parms.GET("PROCREATION_AGE"));
        let renderer = parms.oGET("RENDERER");
        let objRef = renderer.instance;
        renderer.reset();
        renderer.load_GRAPH_DATA(text);
        renderer.initSVGLayers(objRef);
        renderer.createFamilyForceGraph(ds_text);
    });
}
function processFILENAME(_dsname) {
    let dsname = _dsname.replace('wtTAM-','');
    parms.SET("FILENAME", dsname);
    let _tfilename = document.getElementById("filename");
    if (_tfilename) { _tfilename.value = dsname; }
    return dsname;
}

// Process JSON loaded from a .tfm, load linked .ged or
// ask user to upload .ged, then create graph.
function processTFM(json, folder)
{
    // first try to load parameters from .tfm
    if ("parameters" in json) {
        console.log(i18n("L_pf_f"));                   // Loading parameters from file.
        setParameters(json.parameters);
    }
    else {
        console.log(i18n("F_dnc_p"));                   // File does not contain parameters
        set_tamDefaultParameters();
    }
    let _sourceFile = parms.GET("SOURCE_FILE"); // parms.SOURCE_FILE is set by setParameters()
    let _sourcePath = folder + "/" + _sourceFile; // parms.SOURCE_FILE is set by setParameters()

    let ds_infodata = null;
    if ("infoData" in json) {
        ds_infodata = json.infoData;
        if ( ds_infodata.length == 0)
            ds_infodata = null;
    }
    if("nodeData" in json) {
        processGedcom(json.nodeData, ds_infodata, function (gedcom, text) {
            estimateMissingDates(gedcom, parms.GET("PROCREATION_AGE"));

            let renderer = parms.oGET("RENDERER");
            // use node positions from .tfm (if available)
            renderer.load_GRAPH_DATA(text);
            if ("nodePositions" in json) {
                renderer.createFamilyForceGraph(gedcom, json.nodePositions);
            } else {
                renderer.createFamilyForceGraph(gedcom);
            }
            renderer.tickCounterTotal = 0;
            renderer.tickCounterCycles = 5;
        });
    } else {
    // then load the data file .ged
        loadGedcom(_sourcePath, function (gedcom, text) {
            estimateMissingDates(gedcom, parms.GET("PROCREATION_AGE"));

            let renderer = parms.oGET("RENDERER");
            // use node positions from .tfm (if available)
            renderer.load_GRAPH_DATA(text);
            if ("nodePositions" in json) {
                renderer.createFamilyForceGraph(gedcom, json.nodePositions);
            } else {
                renderer.createFamilyForceGraph(gedcom);
            }
            renderer.tickCounterTotal = 0;
            renderer.tickCounterCycles = 5;
        });
    }
}

function checkFileExistence(url)
{
    try {
        console.log(i18n("Ttl"), url);                           // Trying to load

        let req = new XMLHttpRequest();
        req.open("HEAD", url, false);
        req.send();

        return req.status != 404;
    } catch (error) {
        return false;
    }
}

export function closeModal()
{
    document.querySelector("#overlay").style.display = "none";
}


function showModal(missingFileName) {
    if (missingFileName)
        document.querySelector("#missing-ged-file-name").textContent = missingFileName;
    else
        document.querySelector("#missing-ged-file-name").textContent = i18n("unknown");

    document.querySelector("#overlay").style.display = "";
}


// Loads the GEDCOM file and creates the graph
export function processModalFileUpload()
{
    let file = document.querySelector('#modal-file-upload').files[0];
    if (file) {
        closeModal();

        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            loadGedcom(reader.result, function (gedcom, text) {
                estimateMissingDates(gedcom, parms.GET("PROCREATION_AGE"));

                parms.SET("SOURCE_FILE", file.name);

                let renderer = parms.oGET("RENDERER");
                renderer.load_GRAPH_DATA(text);
                // use previously stored node positions (if available)
                if (tfmNodePositions)
                    renderer.createFamilyForceGraph(gedcom, tfmNodePositions);
                else
                    renderer.createFamilyForceGraph(gedcom);
            });
        };
    }
}

// Open special view - 
export function openNewTab(pageName) {
    let _baseUrl = getBaseREF();
    let _isDev = parms.GET("DEVMODE");
    let _pName = pageName;
    if ( _isDev ) { _pName += '-dev'; }
    _pName += ".html";
    let _Url = _baseUrl + "/" + _pName;
    window.open(_Url, "_blank");
}
