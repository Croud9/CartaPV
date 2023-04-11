const canvas = document.getElementById( 'canvas' );
const ctx = canvas.getContext('2d');

// document.addEventListener('DOMContentLoaded', drawTable);
const elm_row_table = document.getElementById('count-row-pv');
const elm_column_table = document.getElementById('count-column-pv');
const elm_offset_table = document.getElementById('offset-pv');
elm_row_table.addEventListener('change', drawTable);
elm_column_table.addEventListener('change', drawTable);
elm_offset_table.addEventListener('change', drawTable);

var heightRatio = 1;
canvas.height = canvas.width * heightRatio;

function drawTable(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let x_start = 0;
    let y_start = 0;
    const col_tables = 2;
    const row_tables = 24;
    const offset_tables = 2;
    // const col_tables = elm_column_table.value;
    // const row_tables = elm_row_table.value;
    // const offset_tables = elm_offset_table.value;

    // const orientation = 'horizontal';
    const orientation = 'vertical';
    const params = {
        w_cell: 10,
        h_cell: 10,
        col_cells: 4,
        row_cells: 7,
        width_pv: 0,
        height_pv: 0
    };
    
    if (orientation == 'horizontal') {
        const col = params.col_cells;
        const row = params.row_cells;
        params.col_cells = row;
        params.row_cells = col;
    };

    params.width_pv = (params.w_cell + 1) * (params.col_cells),
    params.height_pv = (params.h_cell + 1) * (params.row_cells)
    const width_table = params.width_pv * col_tables + offset_tables * (col_tables - 1);
    const height_table = params.height_pv * row_tables + offset_tables * (row_tables - 1);

    let w_scale = 1
    let h_scale = 1

    if (width_table > canvas.width) { 
        w_scale = w_scale / (width_table / canvas.width);
    };
    if (height_table > canvas.height) {
        h_scale = h_scale / (height_table / canvas.height);
    };

    const current_scale = (w_scale < h_scale) ? w_scale : h_scale
    ctx.scale(current_scale, current_scale)
        
    for (let col = 0; col < col_tables; col++) {
        for (let row = 0; row < row_tables; row++) {
            console.log('w - ');
            drawPV(x_start + (params.width_pv + offset_tables) * col, 
                    y_start + (params.height_pv + offset_tables) * row, params);
        };
    };

    ctx.strokeStyle = '#3d3d3d'; 
    ctx.strokeRect(x_start, y_start, width_table, height_table); 
};

function drawPV(x_start, y_start, params) {
    ctx.fillStyle = '#bababa'; 
    ctx.fillRect(x_start, y_start, params.width_pv, params.height_pv); 

    ctx.fillStyle = '#005da8'; 
    for (let col = 0; col < params.col_cells; col++) {
        for (let row = 0; row < params.row_cells; row++) {
            ctx.fillRect(x_start + (params.w_cell + 1) * col, y_start + (params.h_cell + 1) * row, params.w_cell, params.h_cell);
        };
    };
};