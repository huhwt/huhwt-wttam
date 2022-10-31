///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2021 Reinhold Preiner
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
// i18n functionality added by huhwt
// Web storage functionality added by huhwt
// 
// Main script
//
///////////////////////////////////////////////////////////////////////////////

import * as gui from "./guiparts.js";
import { TICKCOUNTER_html } from "./tickcounter.js";
import { loadFileFromDisk, loadDataFromIDB } from "./interfaces.js";
import * as parms from "./parms.js";
import { testDBstore } from "./dbman.js";

export function main(folder, filename) {
    // For to be sure that all IDB-stores are ready for action ...
    testDBstore("wtTAM", ["H-Tree", "TFMdata", "Gedcom"]);

    parms.SET("FILENAME", filename);
    parms.SET("SOURCE_FILE", filename); // original data source (e.g. ".ged" file), which will be referenced in ".tfm" files
    parms.SET("FOLDER", folder);

    prep_action();

    // Load data and create force graph (see interfaces.js).
    // Uses folder and parms.FILENAME from above.
    loadFileFromDisk(folder);
}

export function mainDB(stName) {
    prep_action();

    let idbKey = "";
    switch (stName)
    {
        case "H-Tree":
            idbKey = localStorage.getItem( "actH_tree" );
            localStorage.removeItem("actH_tree");
            loadDataFromIDB("wtTAM", "H-Tree", idbKey);
            break;

        default:
        case "Gedcom":
            idbKey = localStorage.getItem( "loadTAM" );
            localStorage.removeItem("actGedcom");    // EW.H - will be used in case of refactoring
            loadDataFromIDB("wtTAM", "Gedcom", idbKey);
            break;
            }
}

function prep_action() {
    parms.SET("PROCREATION_AGE", 20);
    parms.SET("STATE", "INIT");

    parms.oSET("RENDERER", null);

    let mbHTML = gui.MENUBAR_html();
    let MBelmnt = document.getElementById("menubar");
    MBelmnt.innerHTML = mbHTML;
    let fmHTML = gui.FILE_MODAL();
    let FMelmnt = document.getElementById("overlay");
    FMelmnt.innerHTML = fmHTML;
    let tcHTML = TICKCOUNTER_html();
    let TCelmnt = document.getElementById("tickcountInfo");
    TCelmnt.innerHTML = tcHTML;
}

//# sourceMappingURL=/dist/tamv6.js.map