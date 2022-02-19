//////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
// 'timestamp' added by huhwt
// 'getBaseURL' added by huhwt
//
///////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////
// class vec

export class vec
{
    constructor(x=0, y=0, z=0)
    {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static copy(other)
    {
        let x = other.x ? other.x : 0;
        let y = other.y ? other.y : 0;
        let z = other.z ? other.z : 0;
        return new vec(x,y,z);
    }

    norm() { 
        return Math.sqrt( this.x*this.x + this.y*this.y + this.z*this.z );
    }
    normalize() 
    {
        let il = 1.0 / this.norm();
        return new vec(this.x * il, this.y * il, this.z * il);
    }
    zero()
    {
        return this.x == 0 && this.y == 0 && this.z == 0;
    }
            
    cross(v) { 
        return new vec(this.y*v.z - this.z*v.y, this.z*v.x - this.x*v.z, this.x*v.y - this.y*v.x); 
    }
    dot(v) { 
        return this.x*v.x + this.y*v.y + this.z*v.z; 
    }
    
    // invert orientation
    negate() { return new vec(-this.x, -this.y, -this.z); }
    add(v)   { return new vec(this.x + v.x, this.y + v.y, this.z + v.z ); }
    sub(v)   { return new vec(this.x - v.x, this.y - v.y, this.z - v.z ); }
    div(s)   { return new vec(this.x/s, this.y/s, this.z/s); }
    mul(s)   { return new vec(this.x*s, this.y*s, this.z*s); }
}


///////////////////////////////////////////////////////////////////////////////
// other functions

export function distance(a, b){
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}



export function isNumber(val)
{
    return typeof val == "number";
}


export function jiggle(epsilon = 1e-6)
{
    return (epsilon * (Math.random() - 0.5)) || epsilon;
}


export function darken(col) 
{
    col = d3.hsl(col);
    col.l -= 0.1;
    col = d3.rgb(col.toString());
    col.r *= 0.9;
    col.g *= 0.9;
    col.b *= 0.9;
    return col.toString();
}


export function brighten(col, factor) 
{
    col = d3.hsl(col);
	col = d3.rgb(col.toString());
    col.r *= 1+factor;
    col.g *= 1+factor;
    col.b *= 1+factor;
    return col.toString();
}

export function timestamp()
{
    const ndate = Date.now();
    const today = new Date(ndate);
    return today;
}

export function getBaseURL() {
    var loc = window.location;
    console.log(window.location, window.location.origin);       // EW.Mod ... print origin
    var baseURL = loc.protocol + "//" + loc.hostname;
    if (typeof loc.port !== "undefined" && loc.port !== "") baseURL += ":" + loc.port;
    return baseURL;
}

export function getBaseREF() {
    var loc = window.location;
    console.log(window.location, window.location.origin);       // EW.Mod ... print origin
    var baseREF = loc.href;
    const _baseREF = baseREF.slice(0, baseREF.lastIndexOf('/'));
    return _baseREF;
}

export function cleanDOM(_DOMelem) {
    if ( _DOMelem ) {
        let _ce = _DOMelem[0][0];
        while (_ce.firstChild) {
            _ce.removeChild(_ce.lastChild);
        }
    }
}
