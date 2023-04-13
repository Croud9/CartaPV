import Snap from "snapsvg-cjs";

// document.addEventListener('DOMContentLoaded', drawTable);
const btn_svg_show = document.getElementById('btn-svg-area-show');
const btn_orient_v = document.getElementById('orient-v');
const btn_orient_h = document.getElementById('orient-h');
const orientations = document.getElementsByName('orientation');
const check_type_tracker = document.getElementById('type-table1')
const check_type_fix = document.getElementById('type-table2')
const types = document.getElementsByName('type-table');
const elm_row_table = document.getElementById('count-row-pv');
const elm_column_table = document.getElementById('count-column-pv');
const elm_offset_table = document.getElementById('offset-pv');
elm_row_table.addEventListener('change', drawTable);
elm_column_table.addEventListener('change', drawTable);
elm_offset_table.addEventListener('change', drawTable);
btn_orient_v.addEventListener('click', drawTable);
btn_orient_h.addEventListener('click', drawTable);
check_type_tracker.addEventListener('click', drawTable);
check_type_fix.addEventListener('click', drawTable);
btn_svg_show.addEventListener('click', drawTable);

const svg = Snap("#svg");

function getOrientationPV() {
	for (let direct of orientations) {
		if (direct.checked) return direct.value;
	}
};

function getTypeTable() {
	for (let type of types) {
		if (type.checked) return type.value;
	}
};

function drawTable(e) {
    var height = svg.node.clientHeight;
    var width = svg.node.clientWidth;
    svg.attr({ viewBox: '0 0' + ' ' + width + ' ' +  height});
    svg.clear()
    let orientation_PV
    let x_start = 0;
    let y_start = 0;
    let col_tables = +elm_column_table.value;
    let row_tables = +elm_row_table.value;
    const offset_tables = +elm_offset_table.value;
    const params = {
        w_cell: 10,
        h_cell: 10,
        col_cells: 4,
        row_cells: 7,
        width_pv: 0,
        height_pv: 0,
        scale: 1,
        table: svg.group()
    };

    const type_table = getTypeTable()
    if (type_table == 'fix') {
        [col_tables, row_tables] = [row_tables, col_tables]
    }

    orientation_PV = getOrientationPV()
    if (orientation_PV == 'horizontal') {
        [params.col_cells, params.row_cells] = [params.row_cells, params.col_cells]
    };

    params.width_pv = params.w_cell * params.col_cells + 0.5 * (params.col_cells - 1)
    params.height_pv = params.h_cell * params.row_cells + 0.5 * (params.row_cells - 1)
    const width_table = params.width_pv * col_tables + offset_tables * (col_tables - 1);
    const height_table = params.height_pv * row_tables + offset_tables * (row_tables - 1);

    let w_scale = 1
    let h_scale = 1

    h_scale = (height_table > svg.node.clientHeight) ? 
                h_scale / (height_table / svg.node.clientHeight) : 
                h_scale * (svg.node.clientHeight / height_table)
    
    let width_table_for_scale = width_table
    if (h_scale > 1) width_table_for_scale = width_table * h_scale
    if (width_table_for_scale > svg.node.clientWidth) w_scale = h_scale / (width_table_for_scale / svg.node.clientWidth) 

    if (w_scale < 1 || h_scale < 1) {
        params.scale = (w_scale < h_scale) ? w_scale : h_scale 
    }
    else if (w_scale != 1) {
        params.scale = (w_scale < h_scale) ? w_scale : h_scale 
    }
    else {
        params.scale = h_scale
    }

    const frame_table = svg.rect(x_start, y_start, width_table, height_table);
    frame_table.attr({
        fillOpacity: 0.1,
        fill: '#3d3d3d',
    });
    params.table.add(frame_table)

    for (let col = 0; col < col_tables; col++) {
        for (let row = 0; row < row_tables; row++) {
            drawPV(x_start + (params.width_pv + offset_tables) * col, 
                    y_start + (params.height_pv + offset_tables) * row, params);
        };
    };
    params.table.transform('s' + params.scale +  ' 0 0');
};

function drawPV(x_start, y_start, params) {
    const base_pv = svg.rect(x_start, y_start, params.width_pv, params.height_pv);
    base_pv.attr({
        fill: '#bababa',
    });
    params.table.add(base_pv)

    for (let col = 0; col < params.col_cells; col++) {
        for (let row = 0; row < params.row_cells; row++) {
            const cell_pv = svg.rect(x_start + (params.w_cell + 0.5) * col, y_start + (params.h_cell + 0.5) * row, params.w_cell, params.h_cell);
            cell_pv.attr({
                fill: '#005da8',
                rx: 1.5,
                ry: 1.5,
            });
            params.table.add(cell_pv)
        };
    };
};