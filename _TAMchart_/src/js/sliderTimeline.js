///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
// i18n functionality added by huhwt
//
///////////////////////////////////////////////////////////////////////////////

import * as parms from "./parms.js";

export function TIMELINE_html() {
	let html_tl = `
        <div class="column">
            <div class="sliderTimelineB row">
                <input id="slideButtonB" class="slideButton" type="button" title="Jahre zurückzählen" value="&#x23f4;"/>
                <input id="slideButtonH" class="slideButton-lg" type="button" title="Jahre zählen Stop" value="&#x23f8;"/>
                <input id="slideButtonF" class="slideButton" type="button" title="Jahre hochzählen" value="&#x23f5;"/>
            </div>
            <div class="sliderTimelineB row">
                <input id="slideButtonYM" class="slideButton-sm" type="button" title="-1 Jahr" value="<"/>
                <input id="slideButtonYP" class="slideButton-sm" type="button" title="+1 Jahr" value=">"/>
            </div>
        </div>
        <div class="column align-items-top">
            <div id="yearSlider" title="Jahr einstellen (je 10)"></div>
            <div id="yearRange" title="Anfangs-/Endjahr festlegen"></div>
    </div>`;

    return html_tl;
}

export class TIMELINE 
{
    constructor() 
    {
        const margin = { top: 0, right: 0, bottom: 0, left: 0 };

        let width = window.innerWidth - margin.left - margin.right;

        this.YearS = parms.GET("RANGE_MIN");
        this.YearE = parms.GET("RANGE_MAX");
        this.Year = this.YearS;
        this.YearSo = this.YearS;
        this.YearIncrement = 0;

        let yCount = this.YearE - this.YearS + 1;
        const tRange = d3.range(0, yCount, 10).map(function(d) {
                                            return this.YearS + d;
                                        });

        let yCountL = yCount * 2.4;

        d3.select('#sliderTimeline').css('width', width-500);

        var sSYear = d3.sliderTop()
                    .min(d3.min(tRange))
                    .max(d3.max(tRange))
                    .step(10)
                    .width(yCountL)
                    .tickFormat(d3.format("40"))
                    .tickValues(tRange)
                    .default(this.YearS)
                    .displayValue(false)
                    .fill('#84a4c0')
                    .handle(d3
                            .symbol()
                            .type(d3.symbolDiamond)
                            .size(64)()
                        )
                    .on('onchange', val => {
                        d3.select('#year').text(val);
                        this.Year = val;
                        forceRefresh = true;
                        console.log('slider sSYear');
                        });

        var gSYear = d3.select('div#yearSlider')
                    .append('svg')
                            .attr('top', 0)
                            .attr('left', 12)
                            .attr('width', yCountL+40)
                            .attr('height', 20)
                            .style('margin-left', 18)
                            .attr('class', 'yearSlider')
                    .append('g')
                        .attr("transform", "translate(12, 10)")
                        ;

        gSYear.call(sSYear);

        var sRYear = d3.sliderBottom()
                    .min(d3.min(tRange))
                    .max(d3.max(tRange))
                    .step(10)
                    .width(yCountL)
                    .tickFormat(d3.format("40"))
                    .tickValues(tRange)
                    .default([this.YearS, this.YearE])
                    .displayValue(true)
                    .fill('#84a4c0')
                    .on('onchange', val => {
                        setYearSE(val);
                        forceRefresh = true;
                        console.log('slider sRYear');
                        });

        var gRYear = d3.select('div#yearRange')
                    .append('svg')
                            .attr('top', 0)
                            .attr('left', 12)
                            .attr('width', yCountL+40)
                            .attr('height', 48)
                            .style('margin-left', 18)
                            .attr('class', 'yearRange')
                    .append('g')
                        .attr("transform", "translate(12, 10)")
                        ;

        gRYear.call(sRYear);

    }

    updateSlider() {
        let yStep = (this.Year - this.YearS) % 10;
        if ( yStep == 0) {
            // position = ((year - config.startYear) / (config.endYear - config.startYear)) * 100;
            sSYear.silentValue(this.Year);
        }
    }

    initSlider() {
        // d3.select('#yearSlider').on('change', function() {
        //     position = d3.select("#yearSlider").val();
        //     this.Year = Math.round(((config.endYear - config.startYear) * (position/100)) + config.startYear);
        // });
        d3.select('#slideButtonF').on('click', function() {
            togglePlayer(1);
        });
        d3.select('#slideButtonB').on('click', function() {
            togglePlayer(-1);
        });
        d3.select('#slideButtonH').on('click', function() {
            togglePlayer(0);
        });
        d3.select('#slideButtonYM').on('click', function() {
            moveYear(-1);
        });
        d3.select('#slideButtonYP').on('click', function() {
            moveYear(1);
        });
    }

    togglePlayer(yearIncrement) {
        let sYearIncrement = yearIncrement;
        switch ( yearIncrement ) {
            case -1:
                if (year <= this.YearS) {
                    sYearIncrement = 0;
                }
                setYearIncrement(sYearIncrement);
                break;
            case 1:
                if (year >= this.YearE) {
                    sYearIncrement = 0;
                }
                setYearIncrement(sYearIncrement);
                break;
            default:
                setYearIncrement(0);
        }
    }

    setYear(value) {
        let syear = value;
        if ( syear < this.YearS ) {
            syear = this.YearS;
        }
        if ( syear > this.YearE ) {
            syear = this.YearE;
        }
        if ( syear != this.Year ) {
            this.Year = syear;
            console.log('setYear');
        }
    }

    setYearSE(value) {
        this.YearS = Number(value[0]);
        this.YearE = Number(value[1]);
        if ( this.Year <  this.YearS) {
            this.Year =  this.YearS;
            sSYear.silentValue(this.Year);
            forceRefresh = true;
        } else if ( this.Year >  this.YearE) {
            this.Year =  this.YearE;
            sSYear.silentValue(this.Year);
            forceRefresh = true;
        }
        if ( this.YearS != this.YearSo ) {
            this.YearSo = this.YearS;
            forceRefresh = true;
        }
        // d3.select('#yearRS').html( this.YearS)
        //     .css('left', width/2 - 400 + margin.left)
        //     .css('top', height - 120);
        // d3.select('#yearRE').html( this.YearE)
        //     .css('left', width/2 + 400 + margin.left)
        //     .css('top', height - 120);
        console.log('setYearSE');
    }

    moveYear(value) {
        let syear = this.Year;
        syear += value;
        if ( syear < this.YearS ) {
            syear = 0;
        }
        if ( syear > this.YearE ) {
            syear = 0;
        }
        if (syear > 0) {
            this.Year = syear;
            console.log('moveYear');
        }
    }

    setYearIncrement(value) {
        this.YearIncrement = value;
        forceRefresh = true;
        console.log('setYearIncrement');
    }

    advanceYear(year) {
        if ( this.YearIncrement == 0 ) {
            return year;
        }
        year += this.YearIncrement;
        if (year >=  this.YearE) {
            year =  this.YearE;
            this.YearIncrement = 0;
        } else if (year <=  this.YearS) {
            year =  this.YearS;
            this.YearIncrement = 0;
        }
        return year;
    }

}
