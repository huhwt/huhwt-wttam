function doAJAX(TAMkey, btnID, getID, doneID, TAMpath, textCompleted, nextText) {
    // $('.cce_disabled').click(function(e){
    //     e.preventDefault();
    // });
    $(function() {
        jQuery.fn.extend({
            disable: function(state) {
                return this.each(function() {
                    var $this = $(this);
                    if($this.is('input, button'))
                        this.disabled = state;
                    else
                        $this.toggleClass('cce_disabled', state);
                });
            }
        });
        
        $('a').disable(true);
        
        $('body').on('click', 'a.cce_disabled', function(event) {
            event.preventDefault();
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
            let ged = JSON.parse(ret);
            let ged0 = ged.gedcom;
            let dataset = {
              "thedata":  [{
                "storeID": "gedcom",
                "nodeData": ged0
            }]
            };
            putDB('wtTAM', 'Gedcom', dataset.thedata);
            localStorage.setItem("actGedcom", "gedcom");
            doneGedcom.innerText = textCompleted;
            hrefID.setAttribute("href", TAMpath);
            hrefID.setAttribute("target", "_blank");
            hrefID.innerHTML = nextText;
            // $('.cce_disabled').click = null;
            $('a').disable(false);
            // hrefID.classList.toggle("xyz_disabled");
        },
        complete: function () {
        },
        timeout: function () {
        }
      });
}
