import length from '@turf/length';
import centroid from '@turf/centroid';
import rhumbDestination from '@turf/rhumb-destination';
import booleanParallel from '@turf/boolean-parallel';
import booleanIntersects from '@turf/boolean-intersects';
import transformRotate from '@turf/transform-rotate';
import lineIntersect from '@turf/line-intersect';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanClockwise from '@turf/boolean-clockwise';
import mask from '@turf/mask';
import booleanWithin from '@turf/boolean-within';
import booleanContains from '@turf/boolean-contains';
import lineOverlap from '@turf/line-overlap';
import bearing from '@turf/bearing';
import rewind from '@turf/rewind';
import intersect from '@turf/intersect';
import rhumbBearing from '@turf/rhumb-bearing';
import distance from '@turf/distance';
import { multiLineString, lineString, polygon, point } from '@turf/helpers';
import transformScale from '@turf/transform-scale';
import lineOffset from '@turf/line-offset';

function createPolyWithHole(l_area_for_pv, l_area, union_areas){
    const xy_poly_with_holes = [l_area_for_pv[0]] 
    union_areas.forEach((item) => { 
        if (l_area.toString() !== item.toString()) {
            const hole_intersect = intersect(polygon(item), polygon(l_area_for_pv));
            if (hole_intersect != null) {
                xy_poly_with_holes.push(hole_intersect.geometry.coordinates[0]) 
            }
        };
    });
    let poly_for_pv
    poly_for_pv = polygon(xy_poly_with_holes)
    return poly_for_pv
}

function checkInterPoints(lower_left_point, poly_for_pv, diagonal_area, angle_from_azimut) {
    const pt_direct = rhumbDestination(lower_left_point, diagonal_area, angle_from_azimut, {units: 'kilometers'});
    const pt_direct_revers = rhumbDestination(lower_left_point, -diagonal_area, angle_from_azimut, {units: 'kilometers'});
    const line_direct = lineString([pt_direct_revers.geometry.coordinates, lower_left_point.geometry.coordinates, pt_direct.geometry.coordinates]);
    const inter_points = lineIntersect(poly_for_pv, line_direct);
    return inter_points
};

function farPoints(coordinates) {
    let top_coord = coordinates[0]
    let lower_coord = coordinates[0]
    let right_coord = coordinates[0]
    let left_coord = coordinates[0]
    for (var i = 0; i < coordinates.length; i++) {
        top_coord = (coordinates[i][1] > top_coord[1]) ? coordinates[i] : top_coord
        lower_coord = (coordinates[i][1] < lower_coord[1]) ? coordinates[i] : lower_coord
        left_coord = (coordinates[i][0] < left_coord[0]) ? coordinates[i] : left_coord
        right_coord = (coordinates[i][0] > right_coord[0]) ? coordinates[i] : right_coord
    }   
    return [top_coord, lower_coord, left_coord, right_coord]
};

function offsetPoints(pt_area_start, pt_area_end, offset_border) {
    let string = lineString([pt_area_start, pt_area_end]);
    let rotateLine = transformRotate(string, 90);
    let angle_90 = bearing(rotateLine.geometry['coordinates'][0], rotateLine.geometry['coordinates'][1]);
    let pt_start = rhumbDestination(pt_area_start, offset_border, angle_90, {units: 'kilometers'});
    let pt_end = rhumbDestination(pt_area_end, offset_border, angle_90, {units: 'kilometers'}); 
    return [pt_start, pt_end]
};

function calcAreaForPV(area_initial, params) {
    const border_lines = []
    const points_intersect = []
    const area = rewind(area_initial)
    const coordinates_area = area.geometry.coordinates[0]
    let offset_border = (params.distance_to_barrier + params.distance_to_pv_area) / 1000

    let [pt_start, pt_end] = offsetPoints(coordinates_area[0], coordinates_area[1], offset_border)
    for (let i = 1; i < coordinates_area.length - 1; i++) {
        if (booleanPointInPolygon(pt_start, area) == true && booleanPointInPolygon(pt_end, area) == true) {
            offset_border = offset_border;
            break;
        }
        else if (booleanPointInPolygon(pt_start, area) == false && booleanPointInPolygon(pt_end, area) == false) {
            offset_border = -offset_border;
            break;
        }
        else {
            [pt_start, pt_end] = offsetPoints(coordinates_area[i], coordinates_area[i+1], offset_border)
        }
    }
    
    for (var i = 0; i < coordinates_area.length - 1; i++) {
        [pt_start, pt_end] = offsetPoints(coordinates_area[i], coordinates_area[i + 1], offset_border)
        const line_parallel = lineString([pt_start.geometry['coordinates'], pt_end.geometry['coordinates']])
        border_lines.push(line_parallel)
    }
    
    for (var i = 0; i < border_lines.length; i++) {
        const next = (i != border_lines.length - 1) ? i + 1 : 0
        const isParallel = booleanParallel(border_lines[i], border_lines[next]) 
        const isInter = booleanIntersects(border_lines[i], border_lines[next])
        let intersect
        if (isParallel == false){
            if (isInter == true) {
                intersect = lineIntersect(border_lines[i], border_lines[next])
            }
            else {
                const angle_first = bearing(border_lines[i].geometry['coordinates'][0], border_lines[i].geometry['coordinates'][1]);
                const angle_second = bearing(border_lines[next].geometry['coordinates'][0], border_lines[next].geometry['coordinates'][1]);
                const len_first  = length(border_lines[i], {units: 'kilometers'});
                const len_second  = length(border_lines[next], {units: 'kilometers'});
                const extend_first = rhumbDestination(border_lines[i].geometry['coordinates'][1], len_first * 4, angle_first, {units: 'kilometers'});
                const extend_second = rhumbDestination(border_lines[next].geometry['coordinates'][0], -len_second * 4, angle_second, {units: 'kilometers'});
                const line_extend_first = lineString([border_lines[i].geometry['coordinates'][1], extend_first.geometry['coordinates']])
                const line_extend_second = lineString([border_lines[next].geometry['coordinates'][0], extend_second.geometry['coordinates']])
                intersect = lineIntersect(line_extend_first, line_extend_second)
                // добавить проверку на выход из полигона при очень остром угле, выдавать предупреждение и советовать изменить участок
            }
        }
        points_intersect.push(intersect.features[0].geometry['coordinates'])
    }
    points_intersect.push(points_intersect[0])
    let [top_coord, lower_coord, left_coord, right_coord] = farPoints(points_intersect)
    const poly_for_pv = polygon([points_intersect]);
    return [poly_for_pv, top_coord, lower_coord, left_coord, right_coord]
};

function calcTables(len, width_table, width_offset) {
    let count_tables, offset_border
    count_tables = len / width_table
    if (count_tables >= 2) {
        count_tables = Math.floor(len / (width_table + width_offset))
        offset_border = len - count_tables * (width_table + width_offset)
        if (width_table <= offset_border) {
            count_tables++
            offset_border = (offset_border - width_table)
        }
        else {
            offset_border = (offset_border + width_offset)
        }
    }
    else {
        count_tables = 1
        offset_border = (len - width_table)
    }
    return [count_tables, offset_border]
};

function checkWithin(poly, points, angle) {
    let pt_top_with_offset, pt_bottom_with_offset
    const options = {units: 'kilometers'};
    const offset = length(lineString(points), options) * 0.01;
    if (angle >= 180) {
        pt_top_with_offset = rhumbDestination(points[0], -offset, angle, options);
        pt_bottom_with_offset = rhumbDestination(points[1], offset, angle, options);
    }
    else {
        pt_top_with_offset = rhumbDestination(points[0], offset, angle, options);
        pt_bottom_with_offset = rhumbDestination(points[1], -offset, angle, options);    
    }
    const scale_line = lineString([pt_bottom_with_offset, pt_top_with_offset]);
    const in_poly = booleanWithin(scale_line, poly);
    return in_poly
};

function getPointMerger(poly, points, angle, width_table) {
    const options = {units: 'kilometers'}
    let id = 0;
    let check_within = [];
    let lines_within = [];
    let count_within_lines
    const count_points = points.length
    // console.log('изначально -->', count_points)

    if (count_points == 2) {
        const within = checkWithin(poly, [points[0], points[1]], angle);
        if (within == true) {
            const line = lineString([points[0], points[1]])
            if (length(line, options) >= width_table) lines_within.push(line)
        };
    }
    else if (count_points > 2) {
        while (id < count_points - 1) {
            const within = checkWithin(poly, [points[id], points[id + 1]], angle);
            if (id > 0) {
                if (check_within[id - 1] == true && within == true) {
                    const line = lineString([points[id - 1], points[id + 1]])
                    if (length(line, options) >= width_table) lines_within.push(line)
                }
                else if (check_within[id - 1] == true && within == false) {
                    check_within.push(within)
                    const line = lineString([points[id - 1], points[id]])
                    if (length(line, options) >= width_table) lines_within.push(line)
                }
                else {
                    check_within.push(within)
                    const line = lineString([points[id], points[id + 1]])
                    if (length(line, options) >= width_table) lines_within.push(line)
                };
            }
            else {
                check_within.push(within)
            }
            id++
        };
    };
 
    count_within_lines = lines_within.length
    return [lines_within, count_within_lines]
};

function createPolyPV(line_down, line_up, height_table, width_table, angle_from_azimut, angle_90_for_pv, width_offset_tables) {
    let poly_pv = [];
    const options = {units: 'kilometers'}
    const len_down_line = length(line_down, options);
    let left_down_point_loc
    const coord_place_for_tables = [line_down.geometry.coordinates[0], line_down.geometry.coordinates[1], line_up.geometry.coordinates[0], line_up.geometry.coordinates[1]]
    if (angle_from_azimut == 180) {
        const x = coord_place_for_tables.sort( (a, b) => a[0] - b[0] )[0][0];
        const y = coord_place_for_tables.sort( (a, b) => b[1] - a[1] )[0][1];
        left_down_point_loc = point([x, y])
    }
    else if (angle_from_azimut == 90) {
        const x = coord_place_for_tables.sort( (a, b) => a[0] - b[0] )[0][0];
        const y = coord_place_for_tables.sort( (a, b) => a[1] - b[1] )[0][1];
        left_down_point_loc = point([x, y])
    }
    else if (angle_from_azimut < 90) {
        const bottom_point = coord_place_for_tables.sort( (a, b) => a[1] - b[1] )[0];
        left_down_point_loc = point(bottom_point)
    }
    else {
        const left_point = coord_place_for_tables.sort( (a, b) => a[0] - b[0] )[0];
        left_down_point_loc = point(left_point)
    }

    let [count_tables, offset_border] = calcTables(len_down_line, width_table, width_offset_tables);
    const align_center = offset_border / 2; // center - offset_border / 2; left - 0; right - offset_border
    let offset_point;

    offset_point = rhumbDestination(left_down_point_loc, align_center, angle_from_azimut, options);
    for (let i = 1; i <= count_tables; i++ ) {
        const left_up_point_table = rhumbDestination(offset_point, -height_table, angle_90_for_pv, options);
        const left_line_table = lineString([offset_point.geometry.coordinates, left_up_point_table.geometry.coordinates]);
        offset_point = rhumbDestination(offset_point, width_table, angle_from_azimut, options);
        const right_up_point_table = rhumbDestination(offset_point, -height_table, angle_90_for_pv, options);
        const right_line_table = lineString([offset_point.geometry.coordinates, right_up_point_table.geometry.coordinates]);
        if (i < count_tables) {
            offset_point = rhumbDestination(offset_point, width_offset_tables, angle_from_azimut, options);
        }
        const coords_poly = [left_line_table.geometry.coordinates[0],
        left_line_table.geometry.coordinates[1],
        right_line_table.geometry.coordinates[1],
        right_line_table.geometry.coordinates[0],
        left_line_table.geometry.coordinates[0]]
        const poly_table = polygon([coords_poly])
        poly_pv.push(poly_table)
    }
    return [poly_pv, count_tables]
};

function calcPVs(poly_for_pv, top_coord, lower_coord, left_coord, right_coord, params) {
    let lines_for_PV = []
    const options = {units: 'kilometers'}
    const scan_dist = 0.25 / 1000
    const height_table = params.height_table / 1000 //5m
    const width_table = params.width_table / 1000
    const height_offset_tables = (params.height_offset_tables - params.height_table) / 1000 //10m 
    const width_offset_tables = params.width_offset_tables / 1e5 //20см
    let angle_from_azimut = params.angle_from_azimut // 0 - 180
    
    angle_from_azimut = (angle_from_azimut == 0) ? 180 : angle_from_azimut;
    const angle_90_for_pv = angle_from_azimut + 90
    const start_point = (angle_from_azimut < 90) ? point([right_coord[0], lower_coord[1]]) : point([left_coord[0], lower_coord[1]]);
    const line_diagonal_area = lineString([[left_coord[0], lower_coord[1]], [right_coord[0], top_coord[1]]]);
    const diagonal_area = length(line_diagonal_area, options);
    const top_loc_diagonal = rhumbDestination(start_point, -diagonal_area, angle_90_for_pv, options);
    const end_point = (angle_from_azimut == 180) ? right_coord[0] : top_loc_diagonal.geometry.coordinates[1]
    const x_or_y = (angle_from_azimut == 180) ? 0 : 1
    const x_or_y_sort = (angle_from_azimut == 180) ? 1 : 0
    let lower_left_point = start_point;
    let all_tables = 0

    while (lower_left_point.geometry.coordinates[x_or_y] <= end_point) {
        let top_in_points = [];
        let bottom_in_points = [];
        const check_point_up = rhumbDestination(lower_left_point, -height_table, angle_90_for_pv, options);
        const inter_points = checkInterPoints(lower_left_point, poly_for_pv, diagonal_area, angle_from_azimut).features;
        const check_inter_points = checkInterPoints(check_point_up, poly_for_pv, diagonal_area, angle_from_azimut).features;
        
        check_inter_points.forEach((item) => { top_in_points.push(item.geometry.coordinates) });
        inter_points.forEach((item) => { bottom_in_points.push(item.geometry.coordinates) });
        top_in_points.sort( (a, b) => a[x_or_y_sort] - b[x_or_y_sort] );
        bottom_in_points.sort( (a, b) => a[x_or_y_sort] - b[x_or_y_sort] );
        
        const [top_lines, count_top_lines] = getPointMerger(poly_for_pv, top_in_points, angle_from_azimut, width_table);
        const [bottom_lines, count_bottom_lines] = getPointMerger(poly_for_pv, bottom_in_points, angle_from_azimut, width_table);

        if (count_top_lines != 0 && count_bottom_lines != 0) {
            if (count_top_lines == count_bottom_lines) {
                for (let i = 0; i < count_top_lines; i++) {
                    const line_in_poly = bottom_lines[i];
                    const check_line_for_table = top_lines[i];   

                    const pt_left_up = rhumbDestination(line_in_poly.geometry.coordinates[0], -height_table, angle_90_for_pv, options);
                    const pt_right_up = rhumbDestination(line_in_poly.geometry.coordinates[1], -height_table, angle_90_for_pv, options);
                    const pt_left_down = rhumbDestination(check_line_for_table.geometry.coordinates[0], height_table, angle_90_for_pv, options);
                    const pt_right_down = rhumbDestination(check_line_for_table.geometry.coordinates[1], height_table, angle_90_for_pv, options);

                    const left_line_in_poly = checkWithin(poly_for_pv, [line_in_poly.geometry.coordinates[0], pt_left_up], angle_90_for_pv );
                    const right_line_in_poly = checkWithin(poly_for_pv, [line_in_poly.geometry.coordinates[1], pt_right_up], angle_90_for_pv );
                    
                    let line_left_up, line_right_up, line_up, line_down
                    
                    if (left_line_in_poly == true && right_line_in_poly == true ) {
                        line_left_up = lineString([line_in_poly.geometry.coordinates[0], 
                                                            pt_left_up.geometry.coordinates]);
                        line_right_up = lineString([line_in_poly.geometry.coordinates[1], 
                                                            pt_right_up.geometry.coordinates]);
                        line_up = lineString([pt_left_up.geometry.coordinates, 
                                                    pt_right_up.geometry.coordinates]);
                        line_down = lineString([line_in_poly.geometry.coordinates[0], 
                                                    line_in_poly.geometry.coordinates[1]]);
                    }
                    else if (left_line_in_poly == false && right_line_in_poly == true) {
                        line_left_up = lineString([check_line_for_table.geometry.coordinates[0], 
                                                            pt_left_down.geometry.coordinates]);
                        line_right_up = lineString([line_in_poly.geometry.coordinates[1], 
                                                            pt_right_up.geometry.coordinates]);
                        line_up = lineString([check_line_for_table.geometry.coordinates[0], 
                                                pt_right_up.geometry.coordinates]);
                        line_down = lineString([pt_left_down.geometry.coordinates, 
                                                    line_in_poly.geometry.coordinates[1]]);
                    }
                    else if (left_line_in_poly == true && right_line_in_poly == false) {
                        line_left_up = lineString([line_in_poly.geometry.coordinates[0], 
                                                            pt_left_up.geometry.coordinates]);
                        line_right_up = lineString([check_line_for_table.geometry.coordinates[1], 
                                                            pt_right_down.geometry.coordinates]);
                        line_up = lineString([pt_left_up.geometry.coordinates, 
                                                check_line_for_table.geometry.coordinates[1]]);
                        line_down = lineString([line_in_poly.geometry.coordinates[0], 
                                                    pt_right_down.geometry.coordinates]); 
                    }
                    else {
                        line_left_up = lineString([check_line_for_table.geometry.coordinates[0], 
                                                            pt_left_down.geometry.coordinates]);    
                        line_right_up = lineString([check_line_for_table.geometry.coordinates[1], 
                                                            pt_right_down.geometry.coordinates]); 
                        line_up = lineString([pt_left_down.geometry.coordinates, 
                                                pt_right_down.geometry.coordinates]);
                        line_down = lineString([check_line_for_table.geometry.coordinates[0], 
                                                    check_line_for_table.geometry.coordinates[1]]);       
                    }
                    lines_for_PV.push(line_up);
                    lines_for_PV.push(line_down);
                    lines_for_PV.push(line_left_up);
                    lines_for_PV.push(line_right_up);
                    
                    const [poly_pv, tables] = createPolyPV(line_down, line_up, height_table, width_table, angle_from_azimut, angle_90_for_pv, width_offset_tables)
                    all_tables += tables
                    lines_for_PV = [...lines_for_PV, ...poly_pv]
                }
            }
            else if (count_top_lines > count_bottom_lines) {
                for (let i = 0; i < count_top_lines; i++) {
                    const check_line_for_table = top_lines[i];   

                    const pt_left_down = rhumbDestination(check_line_for_table.geometry.coordinates[0], height_table, angle_90_for_pv, options);
                    const pt_right_down = rhumbDestination(check_line_for_table.geometry.coordinates[1], height_table, angle_90_for_pv, options);

                    const left_line_in_poly = checkWithin(poly_for_pv, [check_line_for_table.geometry.coordinates[0], pt_left_down], angle_90_for_pv );
                    const right_line_in_poly = checkWithin(poly_for_pv, [check_line_for_table.geometry.coordinates[1], pt_right_down], angle_90_for_pv );
                    
                    let line_left_up, line_right_up, line_up, line_down
                    
                    if (left_line_in_poly == true && right_line_in_poly == true ) {
                        line_left_up = lineString([check_line_for_table.geometry.coordinates[0], 
                            pt_left_down.geometry.coordinates]);    
                        line_right_up = lineString([check_line_for_table.geometry.coordinates[1], 
                                                pt_right_down.geometry.coordinates]); 
                        line_down = lineString([pt_left_down.geometry.coordinates, 
                                                    pt_right_down.geometry.coordinates]);
                        line_up = lineString([check_line_for_table.geometry.coordinates[0], 
                                                        check_line_for_table.geometry.coordinates[1]]);
                    }
                    else if (left_line_in_poly == false && right_line_in_poly == true) {
                        line_right_up = lineString([check_line_for_table.geometry.coordinates[1], 
                            pt_right_down.geometry.coordinates]); 
                        line_down = lineString([pt_left_down.geometry.coordinates, 
                            pt_right_down.geometry.coordinates]);
                        const inter_points = lineIntersect(poly_for_pv, line_down).features;
                        line_down = lineString([inter_points[0].geometry.coordinates, 
                            pt_right_down.geometry.coordinates]);
                        const pt_left_up = rhumbDestination(inter_points[0].geometry.coordinates, -height_table, angle_90_for_pv, options);   
                        line_left_up = lineString([inter_points[0].geometry.coordinates, 
                            pt_left_up.geometry.coordinates]); 
                        line_up = lineString([pt_left_up.geometry.coordinates, 
                            check_line_for_table.geometry.coordinates[1]]);
                        }
                    else if (left_line_in_poly == true && right_line_in_poly == false) {
                        line_left_up = lineString([check_line_for_table.geometry.coordinates[0], 
                            pt_left_down.geometry.coordinates]);
                        line_down = lineString([pt_left_down.geometry.coordinates, 
                            pt_right_down.geometry.coordinates]);
                        const inter_points = lineIntersect(poly_for_pv, line_down).features;
                        line_down = lineString([pt_left_down.geometry.coordinates, inter_points[0].geometry.coordinates]);
                        const pt_right_up = rhumbDestination(inter_points[0].geometry.coordinates, -height_table, angle_90_for_pv, options);   
                        line_right_up = lineString([inter_points[0].geometry.coordinates, 
                            pt_right_up.geometry.coordinates]); 
                        line_up = lineString([check_line_for_table.geometry.coordinates[0], 
                            pt_right_up.geometry.coordinates]);
  
                        }
                    else {
                        line_down = lineString([pt_left_down.geometry.coordinates, 
                            pt_right_down.geometry.coordinates]);
                        const inter_points = lineIntersect(poly_for_pv, line_down).features;

                        line_down = lineString([inter_points[0].geometry.coordinates, inter_points[1].geometry.coordinates]);
                        const pt_left_up = rhumbDestination(inter_points[0].geometry.coordinates, -height_table, angle_90_for_pv, options);
                        const pt_right_up = rhumbDestination(inter_points[1].geometry.coordinates, -height_table, angle_90_for_pv, options);   
                        line_right_up = lineString([inter_points[1].geometry.coordinates, 
                            pt_right_up.geometry.coordinates]); 
                        line_left_up = lineString([inter_points[0].geometry.coordinates, 
                            pt_left_up.geometry.coordinates]);
                        line_up = lineString([pt_left_up.geometry.coordinates, 
                            pt_right_up.geometry.coordinates]);  

                    }
                    if (length(line_up, options) >= width_table && length(line_down, options) >= width_table) {
                        lines_for_PV.push(line_up);
                        lines_for_PV.push(line_down);
                        lines_for_PV.push(line_left_up);
                        lines_for_PV.push(line_right_up);

                        const [poly_pv, tables] = createPolyPV(line_down, line_up, height_table, width_table, angle_from_azimut, angle_90_for_pv, width_offset_tables)
                        all_tables += tables
                        lines_for_PV = [...lines_for_PV, ...poly_pv]
                    }
                }  
            }
            else if (count_top_lines < count_bottom_lines) {
                for (let i = 0; i < count_bottom_lines; i++) {
                    const check_line_for_table = bottom_lines[i];   

                    const pt_left_up = rhumbDestination(check_line_for_table.geometry.coordinates[0], -height_table, angle_90_for_pv, options);
                    const pt_right_up = rhumbDestination(check_line_for_table.geometry.coordinates[1], -height_table, angle_90_for_pv, options);

                    const left_line_in_poly = checkWithin(poly_for_pv, [check_line_for_table.geometry.coordinates[0], pt_left_up], angle_90_for_pv );
                    const right_line_in_poly = checkWithin(poly_for_pv, [check_line_for_table.geometry.coordinates[1], pt_right_up], angle_90_for_pv );
                    
                    let line_left_up, line_right_up, line_up, line_down
                    
                    if (left_line_in_poly == true && right_line_in_poly == true ) {
                        line_left_up = lineString([check_line_for_table.geometry.coordinates[0], pt_left_up.geometry.coordinates]);    
                        line_right_up = lineString([check_line_for_table.geometry.coordinates[1], pt_right_up.geometry.coordinates]); 
                        line_down = lineString([check_line_for_table.geometry.coordinates[0], check_line_for_table.geometry.coordinates[1]]);
                        line_up = lineString([pt_left_up.geometry.coordinates, pt_right_up.geometry.coordinates]);
                    }
                    else if (left_line_in_poly == false && right_line_in_poly == true) {
                        line_right_up = lineString([check_line_for_table.geometry.coordinates[1], 
                            pt_right_up.geometry.coordinates]); 
                        line_up = lineString([pt_left_up.geometry.coordinates, 
                            pt_right_up.geometry.coordinates]);
                        const inter_points = lineIntersect(poly_for_pv, line_up).features;
                        line_up = lineString([inter_points[0].geometry.coordinates, 
                            pt_right_up.geometry.coordinates]);
                        const pt_left_down = rhumbDestination(inter_points[0].geometry.coordinates, height_table, angle_90_for_pv, options);   
                        line_left_up = lineString([inter_points[0].geometry.coordinates, 
                            pt_left_down.geometry.coordinates]); 
                        line_down = lineString([pt_left_down.geometry.coordinates, 
                            check_line_for_table.geometry.coordinates[1]]);
                    }
                    else if (left_line_in_poly == true && right_line_in_poly == false) {
                        line_left_up = lineString([check_line_for_table.geometry.coordinates[0], 
                            pt_left_up.geometry.coordinates]);
                        line_up = lineString([pt_left_up.geometry.coordinates, 
                            pt_right_up.geometry.coordinates]);
                        const inter_points = lineIntersect(poly_for_pv, line_up).features;
                        line_up = lineString([pt_left_up.geometry.coordinates, inter_points[0].geometry.coordinates]);
                        const pt_right_down = rhumbDestination(inter_points[0].geometry.coordinates, height_table, angle_90_for_pv, options);   
                        line_right_up = lineString([inter_points[0].geometry.coordinates, 
                            pt_right_down.geometry.coordinates]); 
                        line_down = lineString([check_line_for_table.geometry.coordinates[0], 
                            pt_right_down.geometry.coordinates]);
                    }
                    else {
                        line_up = lineString([pt_left_up.geometry.coordinates, pt_right_up.geometry.coordinates]);
                        const inter_points = lineIntersect(poly_for_pv, line_up).features;
                        line_up = null
                        if (inter_points.length != 0) {
                            line_up = lineString([inter_points[0].geometry.coordinates, inter_points[1].geometry.coordinates]);
                            const pt_left_down = rhumbDestination(inter_points[0].geometry.coordinates, height_table, angle_90_for_pv, options);
                            const pt_right_down = rhumbDestination(inter_points[1].geometry.coordinates, height_table, angle_90_for_pv, options);   
                            line_right_up = lineString([inter_points[1].geometry.coordinates, 
                                pt_right_down.geometry.coordinates]); 
                            line_left_up = lineString([inter_points[0].geometry.coordinates, 
                                pt_left_down.geometry.coordinates]);
                            line_down = lineString([pt_left_down.geometry.coordinates, 
                                pt_right_down.geometry.coordinates]);  

                        }
                    }
                    if (line_up != null) {
                        if (length(line_up, options) >= width_table && length(line_down, options) >= width_table) {
                            lines_for_PV.push(line_up);
                            lines_for_PV.push(line_down);
                            lines_for_PV.push(line_left_up);
                            lines_for_PV.push(line_right_up);
    
                            const [poly_pv, tables] = createPolyPV(line_down, line_up, height_table, width_table, angle_from_azimut, angle_90_for_pv, width_offset_tables)
                            all_tables += tables
                            lines_for_PV = [...lines_for_PV, ...poly_pv]
                        }
                    }
                }
            }
            lower_left_point = rhumbDestination(lower_left_point, -(height_offset_tables + height_table), angle_90_for_pv, options);
        }
        else {    
            lower_left_point = rhumbDestination(lower_left_point, -scan_dist, angle_90_for_pv, options);
        }
    }
    return [lines_for_PV , all_tables]
}

export { calcAreaForPV, calcPVs, createPolyWithHole }