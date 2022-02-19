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
// Context and Language dependant GUI assembling
//
///////////////////////////////////////////////////////////////////////////////

export function MENUBAR_html() {
    let html_os = `
	<fieldset>
		<legend><label class="toggler" for="toggle_os">${i18n("mb_OpSt")}</label></legend>
		<input class="menu_toggler" type="checkbox" id="toggle_os" hidden="" />
        <div class="mcontainer menu">
		<legend><label >${i18n("mb_Open")}</label></legend>
            <div>
                <input class="mbutton" type="button" style="border:1px solid gray" value="${i18n("mb_lIDB")}" id="btnLoad" />
                <input type="file" id="browse" name="fileupload" style="display: none" accept=".json, .ged, .tam, .tfm" />
                <input class="mbutton" type="button" style="border:1px solid gray" value="${i18n("mb_lF")}" id="fakeBrowse" />
            </div>
            <p>
                <input class="filelabel" type="text" id="filename" contentEditable />
            </p>
            <legend><label >${i18n("mb_Store")}</label></legend>
            <div>
                <input class="mbutton" type="button" style="border:1px solid gray" value="${i18n("mb_sIDB")}" id="btnSave" />
                <input class="mbutton" type="button" style="border:1px solid gray" value="${i18n("mb_sF")}" id="btnSaveF" />
                <input class="mbutton" type="button" style="border:1px solid gray" value="${i18n("mb_sSVG")}" id="btnSvgExport" />
            </div>
        </div>
    </fieldset>
    <!-------------------------------------------------------------------------------------->`;
	let html_mb = html_os + `
	<!-------------------------------------------------------------------------------------->
	<div class="title">
		Topographic Attribute Maps
		<span id="version" class="version">1.19</span>
	</div>
	<fieldset>
		<legend><label class="toggler" for="toggle_ia">${i18n("mb_ntrct")}</label></legend>
		<input class="menu_toggler" type="checkbox" id="toggle_ia" hidden="" />
		<table class="menu" border="0" cellpadding="0" cellspacing="1">
			<tr>
				<td class="paramlabel">${i18n("mb_Frz")}</td>
				<td class="param"><label class="switch"><input id="settings_freeze" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_HghlC")}</td>
				<td class="param"><label class="switch"><input id="settings_select_time" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_sYV")}</td>
				<td class="param"><label class="switch"><input id="settings_show_yearvalues" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_sNI")}</td>
				<td class="param"><label class="switch"><input id="settings_show_tooltips" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_sTC")}</td>
				<td class="param"><label class="switch"><input id="settings_show_tickcount" type="checkbox"><span class="slider"></span></label></td>
			</tr>
		</table>
	</fieldset>
	<!-------------------------------------------------------------------------------------->
	<fieldset>
		<legend><label class="toggler" for="toggle_layout">Force Layout</label></legend>
		<input class="menu_toggler" type="checkbox" id="toggle_layout" hidden="" />
		<table class="menu" border="0" cellpadding="0" cellspacing="1">
			<tbody>
				<tr>
					<td class="paramlabel">Gravity X:</td>
					<td class="param"><input type="number" id="settings_gravity_x" min="0" step="0.01" value="0.1" class="paramspinbox"></td>
				</tr>
				<tr>
					<td class="paramlabel">Gravity Y:</td>
					<td class="param"><input type="number" id="settings_gravity_y" min="0" step="0.01" value="0.1" class="paramspinbox"></td>
				</tr>
				<tr>
					<td class="paramlabel">Repulsion Strength:</td>
					<td class="param"><input type="number" id="settings_repulsion_strength" min="0" step="20" value="2000" class="paramspinbox"></td>
				</tr>
				<tr>
					<td class="paramlabel">Link Strength:</td>
					<td class="param"><input type="number" id="settings_link_strength" min="0" step="0.1" value="2" class="paramspinbox"></td>
				</tr>
				<tr>
					<td class="paramlabel">Similarity Strength:</td>
					<td class="param"><input type="number" id="settings_simforce_strength" min="0" step="0.1" value="1" class="paramspinbox"></td>
				</tr>
				<tr>
					<td class="paramlabel">Friction:</td>
					<td class="param"><input type="number" id="settings_friction" min="0.0" max="1.0" step="0.1" value="0.0" class="paramspinbox"></td>
				</tr>
			</tbody>
		</table>
	</fieldset>
	<!-------------------------------------------------------------------------------------->
	<fieldset>
		<legend><label class="toggler" for="toggle_ga">${i18n("mb_GA")}</label></legend>
		<input class="menu_toggler" type="checkbox" id="toggle_ga" hidden="" />
		<table class="menu" border="0" cellpadding="0" cellspacing="1">
			<tbody>
				<tr>
					<td class="paramlabel">${i18n("mb_SG")}</td>
					<td class="param"><label class="switch"><input id="settings_show_graph" type="checkbox"><span class="slider"></span></label></td>
				</tr>
				<tr>
					<td class="paramlabel">${i18n("mb_SL")}</td>
					<td class="param"><label class="switch"><input id="settings_show_links" type="checkbox"><span class="slider"></span></label></td>
				</tr>
				<tr>
					<td class="paramlabel">${i18n("mb_SN")}</td>
					<td class="param"><label class="switch"><input id="settings_show_names" type="checkbox"><span class="slider"></span></label></td>
				</tr>
				<tr>
					<td class="paramlabel">${i18n("mb_LW")}</td>
					<td class="param"><input type="number" id="settings_linkwidth" min="1" max="20" step="1" value="6" class="paramspinbox"></td>
				</tr>
				<tr>
					<td class="paramlabel">${i18n("mb_NR")}</td>
					<td class="param"><input type="number" id="settings_noderadius" min="1" max="100" step="1" value="15" class="paramspinbox"></td>
				</tr>
				<tr>
					<td class="paramlabel">${i18n("mb_NLO")}</td>
					<td class="param"><input type="number" id="settings_pnodeopacity" min="0.0" max="1.0" step="0.1" value="1.0" class="paramspinbox"></td>
				</tr>
			</tbody>
		</table>
	</fieldset>
	<!-------------------------------------------------------------------------------------->
	<fieldset>
		<legend><label class="toggler" for="toggle_ma">${i18n("mb_MA")}</label></legend>
		<input class="menu_toggler" type="checkbox" id="toggle_ma" hidden="" />
		<table class="menu" border="0" cellpadding="0" cellspacing="1">
			<tr>
				<td class="paramlabel">${i18n("mb_SM")}</td>
				<td class="param"><label class="switch"><input id="settings_show_contours" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_RC")}</td>
				<td class="param"><label class="switch"><input id="settings_reversecolor" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_INN")}</td>
				<td class="param"><label class="switch"><input id="settings_interpolation_type" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_EL")}</td>
				<td class="param"><label class="switch"><input id="settings_embed_links" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_ST")}</td>
				<td class="param"><label class="switch"><input id="settings_show_tunnels" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_ES")}</td>
				<td class="param"><label class="switch"><input id="settings_shading" type="checkbox"><span class="slider"></span></label></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_DD")}</td>
				<td class="param"><input type="number" id="settings_dilation_degree" min="0" max="100" step="1" value="1" class="paramspinbox"></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_MinRV")}</td>
				<td class="param"><input type="number" id="settings_range_min" value="1750" class="paramspinbox"></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_MaxRV")}</td>
				<td class="param"><input type="number" id="settings_range_max" value="2020" class="paramspinbox"></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_CS")}</td>
				<td class="param"><input type="number" id="settings_contour_step" min="0" step="1" class="paramspinbox"></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_CSb")}</td>
				<td class="param"><input type="number" id="settings_contour_big_step" min="0" step="10" class="paramspinbox"></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_IS")}</td>
				<td class="param"><input type="number" id="settings_indicator_size" min="0" step="1" class="paramspinbox"></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_HScl")}</td>
				<td class="param"><input type="number" id="settings_height_scale" min="0" max="100" value="80" step="1" class="paramspinbox"></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_Res")}</td>
				<td class="param"><input type="number" id="settings_resolution" min="10" max="5000" value="500" step="1" class="paramspinbox"></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_LSS")}</td>
				<td class="param"><input type="number" id="settings_link_sample_step" min="1" step="1" class="paramspinbox"></td>
			</tr>
			<tr>
				<td class="paramlabel">${i18n("mb_UT")}</td>
				<td class="param"><input type="number" id="settings_underground_threshold" min="0" step="5" class="paramspinbox"></td>
			</tr>
		</table>
	</fieldset>
	<!-------------------------------------------------------------------------------------->
	<fieldset>
		<legend><label>${i18n("language")}</label></legend>
		<table class="menu" border="0" cellpadding="0" cellspacing="1">
			<tr>
				<td class="paramlabel">
					<input class="button" type="button" style="border:1px solid gray" value="de" id="btn_l_de" />
					<input class="button" type="button" style="border:1px solid gray" value="en" id="btn_l_en" />
					<input class="button" type="button" style="border:1px solid gray" value="nl" id="btn_l_nl" />
				</td>
			</tr>
		</table>
	</fieldset>`;

    return html_mb;
}

export function FILE_MODAL() {
    let html_fm = `
    <div id="overlaybg" onclick="closeModal()"></div>
    <div class="modal">
        <button type="button" class="close" onclick="closeModal()" alt="close">×</button>
        <h1>Cannot find GEDCOM file</h1>
        <p><i><span id="missing-ged-file-name">unknown</span></i></p>
        <p>Please select it from your computer, or <br />make sure it is placed within the subfolder <i>\data</i>.</p>
        <form name="data-source">
            <label for="modal-file-upload" class="custom-button">Open file</label>
            <input type="file" id="modal-file-upload" onchange="processModalFileUpload()" accept=".ged" class="input-file">
        </form>
    </div>`;

    return html_fm;
}

export function IDB_INDEX() {
    let html_idbi = `
    <div id="overlaybg"></div>
    <div class="modal">
        <button type="button" class="close" title="close">×</button>
        <h1>Current state IndexedDB</h1>
        <ul id="idbstores">
        </ul>
    </div>`;

    return html_idbi;
}
