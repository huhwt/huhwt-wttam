import { main, mainDB } from "./main.js";

function ready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

ready(function () {
    let idbKey = localStorage.getItem("actH_tree");
    if (idbKey) {
        mainDB("H-Tree");
    } else {
        main("./data","MA.ged");
    }
});
