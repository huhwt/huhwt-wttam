///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
// i18n functionality added by huhwt
// Web storage functionality added by huhwt
// 
// Gedcom Interpreter
//
///////////////////////////////////////////////////////////////////////////////

// import { default as i18n } from "./i18n.js";
import * as parms from "./parms.js";


class Person
{
    constructor(id, givenname, surname, bdate, motherId, fatherId)
    {
        this.id = id;
        this.sex = parms.Sex.FEMALE;
        this.givenname = givenname;
        this.surname = surname;
        this.showname = null;
        this.bdate = bdate;
        this.bplace = null;
        this.ddate = null;
        this.bcolor = "#000";   // bordercolor  -> copied from webtrees-theme

        this.families = [];     // list of families this person belongs to

        this.snotes = [];       // list of (s)notes assigned to this person

        this.is_dup = null;     // if true      -> when person is assigned to at least 2 families, this is as shadow person
    }

    getFullName()
    {
        if (this.givenname || this.surname)
            return this.givenname + " " + this.surname;
        return null;
    }

    getMother()
    {
        for (var f of this.families)
            if (f.children.includes(this))
                return f.wife;
        return null;
    }

    getFather()
    {
        for (var f of this.families)
            if (f.children.includes(this))
                return f.husband;
        return null;
    }

    getChildren()
    {
        var ch = [];
        for (var f of this.families)
            if (this == f.husband || this == f.wife)
                ch = ch.concat(f.children);
        return ch;
    }

    getSpouses()
    {
        var sp = [];
        for (var f of this.families)
            if (this == f.husband && f.wife)
                sp = sp.concat(f.wife);
            else if (this == f.wife && f.husband)
                sp = sp.concat(f.husband);
        return sp;
    }
}


export function loadTFM(TFM_data, callback)
{
    var gedcom = {
        "persons" : new Map(),
        "families" : new Map()
    };
    let lines = TFM_data.split("\n");

    gedcom = build_gedcom(lines);
        
    // ("Loaded " + gedcom.persons.size + " persons in " + gedcom.families.size + " families");
    console.log(i18n("L_Xp_Xf", { nP: gedcom.persons.size, nF: gedcom.families.size } ));
    callback(gedcom, text);
}

export function loadGedcom(url, callback)
{
    d3.text(url).then(function(text) 
    { 
        console.log(url, 'geladen');
        processGedcom(text, callback);
    });
}


export function processGedcom(text, info_data, callback)
{
    var gedcom = {
    };

    let lines = text.split("\n");

    gedcom = build_gedcom(lines);

    // info_data:
    // - Nxrefs     -> key: sNOTE-id, value: TAGtext
    // - txtNotes   -> key: NOTEtext, value: sNOTE-id

    if (info_data) {
        if( info_data.Nxrefs ) {
            let _notes = new Map();
            let Nxrefs = info_data.Nxrefs;
            for(const [nxref, ntext] of Object.entries(Nxrefs))
            {
                let _xref = '@' + nxref + '@';
                _notes.set(_xref, ntext);
            }
            // gedcom.snotes = _notes;
            gedcom.persons.forEach(p =>
            {
                if ( p.snotes.length > 0 ) {
                    let _snotes = [];
                    for(let i=0; i < p.snotes.length; i++) {
                        let nk = p.snotes[i];
                        if ( _notes.has(nk)) {
                            _snotes.push(_notes.get(nk));
                        }
                    }
                    p.snotes = _snotes;
                }
            });
            gedcom.families.forEach(f =>
                {
                    if ( f.snotes.length > 0 ) {
                        for(let i=0; i < f.snotes.length; i++) {
                            let nk = f.snotes[i];
                            f.snotes[i] = _notes.get(nk);
                        }
                    }
            });
        }
    }

    // ("Loaded " + gedcom.persons.size + " persons in " + gedcom.families.size + " families");
    console.log(i18n("L_Xp_Xf", { nP: gedcom.persons.size, nF: gedcom.families.size } ));
    callback(gedcom, text);
}


function build_gedcom(lines)
{
    var gedcom = {
        "persons" : new Map(),
        "persons_dup" : new Map(),
        "families" : new Map(),
        "famChilds" : new Map(),
        "adoptions" : new Map()
    };
    var current_pers        = null;
    var current_fam         = null;
    var current_adop        = null;
    var current_parentType  = null;
    var adop_child          = null;


    var nodeType = "";

    let p_id = '';
    let f_id = '';
    for (let i = 0; i < lines.length; i++)
    {
        var tokens = lines[i].split(" ");
        if (tokens[0] == "0" && tokens.length > 2)
        {
            nodeType = tokens[2].trim();
            if (nodeType == "INDI")
            {
                let id = tokens[1].toString();
                p_id = id;
                current_pers = new Person(id, null, null, null, 0, 0);
                gedcom.persons.set(id, current_pers);
                current_fam = null;
            }
            else if (nodeType == "FAM")
            {
                let id = tokens[1];
                p_id = '';
                current_fam = {
                    f_id : id,
                    husband : null,
                    wife : null,
                    mdate : null,
                    mtype : null,
                    children : [],
                    snotes: []
                };
                gedcom.families.set(id, current_fam);
                current_pers = null;
            }
            else
            {
                current_pers = null;
                current_fam = null;
            }
        }
        //-------------------------------------------------------------
        else if (tokens[0] == "1")
        {
            nodeType = tokens[1].trim();
            current_parentType = nodeType;

            //-------------------------- encounterd while parsing PERSONS
            if (current_parentType == "NAME" && current_pers && current_pers.getFullName() == null)
            {
                let _sname = "";    let _snpars = false;
                let _gname = "";    let _gnpars = false;
                let _nsuff = "";
                for (let j = 2; j < tokens.length; j++)
                {
                    let _tj = tokens[j].trim();
                    if (current_pers.surname == null && _tj.startsWith("/")) {
                        _sname  = _tj.replace(/\//g, " ").trim();
                        _gnpars = false;
                        if ( _tj.endsWith("/")) {
                            current_pers.surname = _sname;
                        } else {
                            _snpars = true;
                        }
                    } else if (current_pers.surname == null & _snpars) {
                        _sname  += ' ' + _tj.replace(/\//g, " ").trim();
                        if ( _tj.endsWith("/")) {
                            _snpars = false;
                            current_pers.surname = _sname;
                            }
                    } else {
                        if (current_pers.givenname == null) {                          // given name
                            current_pers.givenname = _tj;
                            _gnpars = true;
                        } else if(_gnpars) {
                            current_pers.givenname = current_pers.givenname + ' ' + _tj;
                        } else {
                            if (_nsuff == "")
                                _nsuff = _tj.trim();
                            else
                                _nsuff += ' ' + _tj.trim();
                        }
                    }
                }
                if (current_pers.givenname == null) {
                    current_pers.givenname = i18n("unknown");
                }
                if (current_pers.surname == null && _sname > "") {
                    current_pers.surname = _sname;
                }
                if ( _nsuff > "" ) {
                    current_pers.surname += ' ' + _nsuff;
                }
                current_pers.showname = current_pers.surname + ", " + current_pers.givenname;
            }
            else if (nodeType == "SEX" && current_pers)
            {
                let _sex = tokens[2].trim();
                switch (_sex) {
                    case "M": current_pers.sex = parms.Sex.MALE; break;
                    case "F": current_pers.sex = parms.Sex.FEMALE; break;
                    case "X": current_pers.sex = parms.Sex.DIVERS; break;
                    default:  current_pers.sex = parms.Sex.UNKNOWN;
                }
            }
            else if (nodeType == "FAMC" && current_pers)
            {
                let fc_id = tokens[2].trim();
                if (!gedcom.famChilds.get(p_id))
                    gedcom.famChilds.set(p_id, fc_id);
            }
            //-------------------------- encounterd while parsing FAMILIES
            else if (nodeType == "HUSB")
            {
                // important to trim trailing \r from id token!!
                let person = gedcom.persons.get(tokens[2].trim());
                if (person) {
                    // create bidirectional link between family and person
                    person.families.push(current_fam);
                    current_fam.husband = person;
                }
            }
            else if (nodeType == "WIFE")
            {
                let person = gedcom.persons.get(tokens[2].trim());
                if (person) {
                    // create bidirectional link between family and person
                    person.families.push(current_fam);
                    current_fam.wife = person;
                }
            }
            else if (nodeType == "CHIL")
            {
                let id = tokens[2].trim();
                if (!gedcom.persons.get(id))
                    gedcom.persons.set(id, new Person(id, null, null, null, 0, 0));
                // create bidirectional link between family and person
                let fc_id = gedcom.famChilds.get(id);
                let person = gedcom.persons.get(id);
                if (fc_id == current_fam.f_id) {
                    current_fam.children.push(person);
                    person.families.push(current_fam);
                } else {
                    let dp_id = id + "_dup";
                    for (let i=1; i<99; i++) {
                        let p_t = gedcom.persons.get(dp_id);
                        if (p_t) { dp_id = id + "dup-" + i.toString(); } else { break; }
                    }
                    let person_dup = Person_dup(person, dp_id);
                    // gedcom.persons.set(dp_id, person_dup);
                    current_fam.children.push(person_dup);
                    person_dup.families.push(current_fam);
                    gedcom.persons_dup.set(dp_id, person_dup);
                }
            }
            //-------------------------- encounterd while parsing PERSONS as well as FAMILIES
            else if (nodeType == "NOTE")
            {
                let id = tokens[2].trim();
                if ( !(id.indexOf('@') < 0)) {
                    if ( current_pers ) {
                        current_pers.snotes.push(id);
                    }
                    if ( current_fam ) {
                        current_fam.snotes.push(id);
                    }
                }
            }
        }
        //-------------------------------------------------------------
        else if (tokens[0] == "2")
        {
            if (tokens[1] == "DATE" && tokens.length > 2)
            {
                let date = null;
                let datestr = tokens.slice(2).join(" ");

                let cleanstr = datestr
                    .toLowerCase()
                    // unwanted characters and words
                    .replace(/\./g, ' ').replace("?"," ").replace(","," ")
                    .replace("abt"," ").replace("before").replace("bef"," ")
                    .replace("undefined "," ").replace("undef "," ")
                    .replace("um "," ")
                    // common german wording replacements
                    .replace("jänner","jan").replace("januar ","jan ")
                    .replace("feber","feb").replace("februar ","feb ")
                    .replace("märz","mar").replace("mai","may")
                    .replace("juni","jun").replace("juli","jul")
                    .replace("okt","oct").replace("dez","dec")
                    .replace("ä","a")
                    .trim()
                    ;
               
                // add day number in case only month and year is given
                if (cleanstr.split(" ")
                    .filter(function(v,i,a){ return v != ""; }).length == 2 && /^[jfmasond]/.test(cleanstr)
                    )
                    cleanstr = "1 " + cleanstr;
                
                // convert to timestap in ms
                let datems = Date.parse(cleanstr);
                
                if (!isFinite(datems))
                {
                    // parsing error -> parse ourselves
                    let a = cleanstr.split(" ").filter(function(v,i,a){ return v != ""; });
                    if (a.length > 2)
                    {
                        let customstr = a[2].trim() + "-" + a[1].trim() + "-" + a[0].trim();
                        datems = Date.parse(customstr); 
                        if (isFinite(datems))
                            date = new Date(datems);
                        else
                            console.log("Can't parse custom date string '"+customstr+"' ("+cleanstr+")("+datestr+")");
                    }
                    else
                    {
                        console.log("Can't parse date string '"+datestr+"' ("+cleanstr+")");
                        date = null; // unknown date
                    }
                }
                else
                    date = new Date(datems);
                
                // set date to event
                if (current_parentType == "BIRT") current_pers.bdate = date;
                else if (current_parentType == "DEAT") current_pers.ddate = date;
                else if (current_parentType == "MARR") current_fam.mdate = date;
            }
            //-------------------------- encounterd while parsing FAMILIES
            else if (tokens[1] == "TYPE" && current_fam)
            {
                let type = tokens[2].trim();
                current_fam.mtype = type;
            }
            //-------------------------- encounterd while parsing PERSONS
            else if (tokens[1] == "FAMC")
            {
                if (current_parentType == "ADOP") {
                    f_id = tokens[2].trim();
                    current_adop = {
                        family : f_id,
                        children : []
                    };
                    if (!gedcom.adoptions.get(f_id))
                        gedcom.adoptions.set(f_id, current_adop);
                    adop_child = {
                        child : p_id,
                        adop  : null
                    };
                }
            }
        }
        //-------------------------------------------------------------
        else if (tokens[0] == "3")
        {
            //-------------------------- encounterd while parsing PERSONS
            if (tokens[1] == "ADOP") {
                let adop_type   = tokens[2].trim();
                adop_child.adop = adop_type;
                current_adop    = gedcom.adoptions.get(f_id);
                current_adop.children.push(adop_child);
                gedcom.adoptions.set(f_id, current_adop);
            }
        }
    }
    return gedcom;
}
function Person_dup(person, dp_id)
{
    let p_dup = new Person(dp_id, null, null, null, 0, 0);

    p_dup.sex       = person.sex;
    p_dup.givenname = person.givenname;
    p_dup.surname   = person.surname;
    p_dup.showname  = person.showname;
    p_dup.bdate     = person.bdate;
    p_dup.bplace    = person.bplace;
    p_dup.ddate     = person.ddate;
    p_dup.bcolor    = person.bcolor;
    // we don't want to duplicate families 
    p_dup.snotes    = person.snotes;

    p_dup.p_id      = person.id;            // ref to primary person
    p_dup.is_dup    = true;

    return p_dup;
}
export function estimateMissingDates(gedcom, procreationAge)
{
    let updated = true;
    while (updated)
    {
        // continue estimation until nothing was updated anymore
        updated = false;
        /*jshint -W083 */
        gedcom.persons.forEach( function(p){
            if (p.bdate == null)    // missing date of birth
            {
                let mother = p.getMother();
                let father = p.getFather();

                // birthday of youngest parent
                let pbdate = null;
                let mbdate = mother ? mother.bdate : null;
                let fbdate = father ? father.bdate : null;
                if (mbdate != null && fbdate == null) pbdate = mbdate;
                else if (mbdate == null && fbdate != null) pbdate = fbdate;
                else if (mbdate && fbdate) pbdate = (mbdate > fbdate) ? mbdate : fbdate;
                
                // birthday of oldest child
                let cbdate = null;
                let children = p.getChildren();
                for (let c of children)
                    if (cbdate == null)
                        cbdate = c.bdate;
                    else if (c.bdate && c.bdate < cbdate)
                        cbdate = c.bdate;

                // birthday of oldest spouse
                let spbdate = null;
                let spouses = p.getSpouses();
                for (let sp of spouses)
                    if (spbdate == null)
                        spbdate = sp.bdate;
                    else if (sp.bdate && sp.bdate < spbdate)
                        spbdate = sp.bdate;


                // estimate based on parent or child birthdates
                if (pbdate != null || cbdate != null)
                {
                    if (pbdate != null && cbdate == null)  
                    {
                        p.bdate = new Date(pbdate.getTime());
                        p.bdate.setFullYear(p.bdate.getFullYear() + procreationAge);
                    }
                    else if (pbdate == null && cbdate != null)  
                    {
                        p.bdate = new Date(cbdate.getTime());
                        p.bdate.setFullYear(p.bdate.getFullYear() - procreationAge);
                    }
                    else if (pbdate != null && cbdate != null)
                    {
                        p.bdate = new Date((pbdate.getTime() + cbdate.getTime())/2);
                    }
                
                    // ("Missing birth date of " + p.getFullName() + " was estimated " + p.bdate);
                    console.log(i18n("M_bdo_we", { pFN: p.getFullName(), pbd: p.bdate } ));
                    updated = true;
                }
                // neither parents nor childs are known - estimate based on spouse's bdate
                else if (spbdate != null)
                {
                    p.bdate = new Date(spbdate.getTime());  // assume person is of the same age as his oldest spouse
                    updated = true;
                }
            }
        });
    }

    // check who's left
    gedcom.persons.forEach( function(p){
        if (p.bdate == null)    // missing date of birth
        {
            // ("Still missing birth date of " + p.getFullName());
            console.log(i18n("S_mbd_o", { pFN: p.getFullName() } ));
        }
    });
}
