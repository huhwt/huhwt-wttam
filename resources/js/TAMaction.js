function doAJAX(TAMkey, btnID, getID, doneID, TAMpath, textCompleted, nextText) {
    // $('.cce_disabled').click(function(e){
    //     e.preventDefault();
    // });
    $(function() {
        $('body').on('click', 'a.cce_disabled', function(event) {
            event.preventDefault();
        });

        $('#btn_DSname').on('click', function(event) {
            setOwnIdent();
        });
    });    
    var hrefID = document.getElementById(btnID);
    var ajaxElem = document.getElementById(getID);
    var ajaxElemd = ajaxElem.dataset;
    var ajaxGedcom = ajaxElemd.urlGedcom;
    var doneGedcom = document.getElementById(doneID);
    jQuery.ajax({
        url: ajaxGedcom,
        dataType: 'text',
        data: 'q=' + TAMkey,
        success: function (ret) {
            let response = JSON.parse(ret);
            let gedcom = response.gedcom;
            let dsname = response.dsname;
            let infodata = {};
            if (response.infodata)
                infodata = response.infodata;
            let dataset = {
              "gedData":  [{
                "storeID": "download",
                "nodeData": gedcom,
                "dsname": dsname,
                "infoData": infodata
            }]
            };
            putDB('wtTAM', 'Gedcom', dataset.gedData);
            localStorage.setItem("loadTAM", "download");
            doneGedcom.innerText = textCompleted;
            hrefID.setAttribute("href", TAMpath);
            hrefID.setAttribute("target", "_blank");
            hrefID.innerHTML = nextText;
            hrefID.classList.toggle("cce_disabled");
        },
        complete: function () {
        },
        timeout: function () {
        }
      });
}

function setOwnIdent() {
    var ownDSname = document.getElementById('vizDSname');
    if (ownDSname.value == '') { return; }
    const dbaction = readFromDB('wtTAM', 'Gedcom', 'download');
    dbaction.then( value => { 
                    console.log(value);
                    setOwnIdentDo(value, ownDSname);
                 } )
            .catch(err => { console.log(err); } )
            ;
}
function setOwnIdentDo(dbset, ownDSname) {
    let odsname = ownDSname.value;
    let dataset = {
        "gedData":  [{
          "storeID": dbset.storeID,
          "dsname": odsname,
          "nodeData": dbset.nodeData
      }]};
    putDB('wtTAM', 'Gedcom', dataset.gedData);
    var defDSname = document.getElementById('TAMdname');
    defDSname.textContent = odsname;
    ownDSname.value = '';
}
