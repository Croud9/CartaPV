import area from '@turf/area';
import length from '@turf/length';
import centroid from '@turf/centroid';
import rhumbDestination from '@turf/rhumb-destination';
import booleanParallel from '@turf/boolean-parallel';
import booleanIntersects from '@turf/boolean-intersects';
import transformRotate from '@turf/transform-rotate';
import lineIntersect from '@turf/line-intersect';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanClockwise from '@turf/boolean-clockwise';
import booleanWithin from '@turf/boolean-within';
import booleanContains from '@turf/boolean-contains';
import lineOverlap from '@turf/line-overlap';
import bearing from '@turf/bearing';
import rhumbBearing from '@turf/rhumb-bearing';
import distance from '@turf/distance';
import { multiLineString, lineString, polygon, point } from '@turf/helpers';
import transformScale from '@turf/transform-scale';
import lineOffset from '@turf/line-offset';
import maplibregl from 'maplibre-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxElevationControl from "@watergis/mapbox-gl-elevation";
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';

// import { MapboxStyleDefinition, MapboxStyleSwitcherControl } from "mapbox-gl-style-switcher";
// import { style } from "./switcher";

var map = new maplibregl.Map({
        container: 'map',
        zoom: 12,
        center: [100, 65],
        style:
        'https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd', // Актуальные, бесшовные изображения для всего мира с учетом контекста
        // 'https://api.maptiler.com/maps/3f98f986-5df3-44da-b349-6569ed7b764c/style.json?key=QA99yf3HkkZG97cZrjXd' //Идеальная карта для активного отдыха
        // 'https://api.maptiler.com/maps/975e75f4-3585-4226-8c52-3c84815d6f2a/style.json?key=QA99yf3HkkZG97cZrjXd' // Идеальная базовая карта местности с контурами и заштрихованным рельефом.
        
        // antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
    }); 

map.addControl(
    new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true
    })
    );
  
map.addControl(new maplibregl.FullscreenControl());

var draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
        polygon: true,
        trash: true
    }
});
map.addControl(draw);
map.on('draw.create', updateArea);
map.on('draw.delete', updateArea);
map.on('draw.update', updateArea);

function checkInterPoints(lower_left_point, poly_for_pv, width_area, angle_from_azimut) {
    const destination_right = rhumbDestination(lower_left_point, width_area, angle_from_azimut, {units: 'kilometers'});
    const line_coords = lineString([lower_left_point.geometry['coordinates'], destination_right.geometry['coordinates']])
    const inter_points = lineIntersect(poly_for_pv, line_coords);
    return inter_points
}

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

function calcAreaForPV(id_area) {
    const border_lines = []
    const points_intersect = []
    const area = draw.get(id_area)
    const coordinates_area = area.geometry['coordinates'][0]
    let offset_border = 0.02

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
    const options = {units: 'kilometers'};
    const offset = length(lineString(points), options) * 0.01;
    const pt_top_with_offset = rhumbDestination(points[0], -offset, angle, options);
    const pt_bottom_with_offset = rhumbDestination(points[1], offset, angle, options);
    const scale_line = lineString([pt_bottom_with_offset, pt_top_with_offset]);
    const in_poly = booleanWithin(scale_line, poly);
    return in_poly
};

function calcPVs(poly_for_pv, top_coord, lower_coord, left_coord, right_coord) {
    const options = {units: 'kilometers'}
    const scan_dist = 0.25 / 1000
    const height_table = 5 / 1000 //5m
    const width_table = 10 / 1000
    const width_offset_tables = 20 / 1e5 //20см
    const height_offset_tables = 10 / 1000 //10m 
    const angle_from_azimut = 90
    const angle_90_for_pv = angle_from_azimut + 90
    const line_width_area = lineString([[left_coord[0], lower_coord[1]], [right_coord[0], lower_coord[1]]])
    const width_area  = length(line_width_area, options);
    const lines_for_PV = []
    let lower_left_point = point([left_coord[0], lower_coord[1]]);
    let idx = 0
    let id_tables = 0
    let all_tables = 0

    while (lower_left_point.geometry['coordinates'][1] <= top_coord[1]) {
        let top_in_points = [];
        let bottom_in_points = [];
        const check_point_up = rhumbDestination(lower_left_point, -height_table, angle_90_for_pv, options);
        const inter_points = checkInterPoints(lower_left_point, poly_for_pv, width_area, angle_from_azimut).features;
        const check_inter_points = checkInterPoints(check_point_up, poly_for_pv, width_area, angle_from_azimut).features;
        inter_points.forEach((item) => { bottom_in_points.push(item.geometry.coordinates) });
        check_inter_points.forEach((item) => { top_in_points.push(item.geometry.coordinates) });
        bottom_in_points.sort( (a, b) => a[0] - b[0] );
        top_in_points.sort( (a, b) => a[0] - b[0] );
        if (bottom_in_points.length % 2 == 0 && top_in_points.length % 2 == 0 &&
                bottom_in_points.length == top_in_points.length) {
            let some_inter = 0;
            const count_inter = bottom_in_points.length / 2;
            for (let i = 0; i < count_inter; i++) {
                const line_in_poly = lineString([bottom_in_points[some_inter], 
                                                    bottom_in_points[some_inter + 1]]);
                const check_line_for_table = lineString([top_in_points[some_inter], 
                                                            top_in_points[some_inter + 1]]);   
                some_inter += 2                                                          
                const len_main_line = length(line_in_poly, options);
                const len_check_line = length(check_line_for_table, options);
                if (len_main_line >= width_table && len_check_line >= width_table) {
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
                    const len_down_line = length(line_down, options);
                    lines_for_PV.push(line_up);
                    lines_for_PV.push(line_down);
                    lines_for_PV.push(line_left_up);
                    lines_for_PV.push(line_right_up);
                    let [count_tables, offset_border] = calcTables(len_down_line, width_table, width_offset_tables);
                    all_tables += count_tables;
                    const align_center = offset_border / 2;
                    let offset_point, left_pt_loc, down_pt_loc;
                    
                    // строится только от нижней линии, нужно чтобы выбирал основную  линию и ограничивал себя
                    left_pt_loc = (line_down.geometry.coordinates[0][0] < line_down.geometry.coordinates[1][0]) ? 0 : 1
                    down_pt_loc = (line_left_up.geometry.coordinates[0][1] < line_left_up.geometry.coordinates[1][1]) ? 0 : 1

                    const left_down_point_loc = point([line_down.geometry.coordinates[left_pt_loc][0], line_left_up.geometry.coordinates[down_pt_loc][1]])
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
                        lines_for_PV.push(poly_table)
                        id_tables++
                    }
                    idx++
                }
                else {    
                    lower_left_point = rhumbDestination(lower_left_point, -scan_dist, angle_90_for_pv, options);
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

function drawPVs(id_area, square_text, answer) {
    // var bearing_peling = rhumbBearing(rotateLine.geometry['coordinates'][0], rotateLine.geometry['coordinates'][1]);
    // console.log('угол от севера ' + bearing1 + ' / ' + bearing_peling);
    const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(id_area)


    const current_source_poly = map.getSource(`poly_for_pv${id_area}`)
    if (current_source_poly === undefined) {
        map.addSource(`poly_for_pv${id_area}`, { 'type': 'geojson', 'data': poly_for_pv });
        map.addLayer({
            'id': `poly_for_pv${id_area}`,
            'type': 'fill',
            'source': `poly_for_pv${id_area}`,
            // 'layout': {},
            'paint': {
                'fill-color': '#00cc55',
                'fill-opacity': 0.7
            }
        });
    }
    else {
        current_source_poly.setData(poly_for_pv);
    }
    
    const [lines_for_PV , all_tables] = calcPVs(poly_for_pv, top_coord, lower_coord, left_coord, right_coord)
    const current_source_pvs = map.getSource(`pvs${id_area}`)
    if (current_source_pvs === undefined) {
        map.addSource(`pvs${id_area}`, {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': lines_for_PV
            }
        });
        map.addLayer({
            'id': `pvs_line${id_area}`,
            'type': 'line',
            'source': `pvs${id_area}`,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#B42222',
                'line-width': 1
            },
            'filter': ['==', '$type', 'LineString']
        });
        map.addLayer({
            'id': `pvs_poly${id_area}`,
            'type': 'fill',
            'source': `pvs${id_area}`,
            'paint': {
                'fill-color': '#3333ff',
                'fill-opacity': 0.4
            },
            'filter': ['==', '$type', 'Polygon']
        });
    }
    else {
        current_source_pvs.setData({
            'type': 'FeatureCollection',
            'features': lines_for_PV
        });
    }
    answer.innerHTML = square_text + '<p>Столов: <strong>' + all_tables + ' </strong>шт.</p>'
}

function updateArea(e) {
    const id_area = e.features[0].id
    const all_data = draw.getAll();
    const answer = document.getElementById('calculated-area');

    if (all_data.features.length > 0) {
        const square = area(draw.get(id_area));
        const rounded_area_ga = Math.round((square / 10000) * 100) / 100;
        const rounded_area_m = Math.round(square * 100) / 100;
        const square_text = 'Площадь области: <strong>' + 
                                rounded_area_ga + 
                                '</strong> га / <strong>' + 
                                rounded_area_m + 
                                '</strong> м²';
        answer.innerHTML = square_text                       
        drawPVs(id_area, square_text, answer);
    } else {
        answer.innerHTML = '';
        if (e.type !== 'draw.delete')
        alert('Use the draw tools to draw a polygon!');
    }
}





















// data from OpenStreetMap.
// map.on('load', function () {
//     // Insert the layer beneath any symbol layer.
//     var layers = map.getStyle().layers;

//     var labelLayerId;
//     for (var i = 0; i < layers.length; i++) {
//         if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
//             labelLayerId = layers[i].id;
//             break;
//         }
//     }

//     map.addLayer(
//         {
//             'id': '3d-buildings',
//             'source': 'openmaptiles',
//             'source-layer': 'building',
//             'filter': ['==', 'extrude', 'true'],
//             'type': 'fill-extrusion',
//             'minzoom': 15,
//             'paint': {
//                 'fill-extrusion-color': '#aaa',

//                 // use an 'interpolate' expression to add a smooth transition effect to the
//                 // buildings as the user zooms in
//                 'fill-extrusion-height': [
//                     'interpolate',
//                     ['linear'],
//                     ['zoom'],
//                     15,
//                     0,
//                     15.05,
//                     ['get', 'height']
//                 ],
//                 'fill-extrusion-base': [
//                     'interpolate',
//                     ['linear'],
//                     ['zoom'],
//                     15,
//                     0,
//                     15.05,
//                     ['get', 'min_height']
//                 ],
//                 'fill-extrusion-opacity': 0.6
//             }
//         },
//         labelLayerId
//     );
// });

// var geocoder_api = {
//     forwardGeocode: async (config) => {
//         const features = [];
//         try {
//             let request =
//                 'https://nominatim.openstreetmap.org/search?q=' +
//                 config.query +
//                 '&format=geojson&polygon_geojson=1&addressdetails=1';
//             const response = await fetch(request);
//             const geojson = await response.json();
//             for (let feature of geojson.features) {
//                 let center = [
//                     feature.bbox[0] +
//                         (feature.bbox[2] - feature.bbox[0]) / 2,
//                     feature.bbox[1] +
//                         (feature.bbox[3] - feature.bbox[1]) / 2
//                 ];
//                 let point = {
//                     type: 'Feature',
//                     geometry: {
//                         type: 'Point',
//                         coordinates: center
//                     },
//                     place_name: feature.properties.display_name,
//                     properties: feature.properties,
//                     text: feature.properties.display_name,
//                     place_type: ['place'],
//                     center: center
//                 };
//                 features.push(point);
//             }
//         } catch (e) {
//             console.error(`Failed to forwardGeocode with error: ${e}`);
//         }

//         return {
//             features: features
//         };
//     }
// };
// map.addControl(
//     new MaplibreGeocoder(geocoder_api, {
//         maplibregl: maplibregl
//     })
// );









// var distanceContainer = document.getElementById('distance');
// // GeoJSON object to hold our measurement features
// var geojson = {
//     'type': 'FeatureCollection',
//     'features': []
// };

// // Used to draw a line between points
// var linestring = {
//     'type': 'Feature',
//     'geometry': {
//         'type': 'LineString',
//         'coordinates': []
//     }
// };

// map.on('load', function () {
//     map.addSource('geojson', {
//         'type': 'geojson',
//         'data': geojson
//     });

//     // Add styles to the map
//     map.addLayer({
//         id: 'measure-points',
//         type: 'circle',
//         source: 'geojson',
//         paint: {
//             'circle-radius': 5,
//             'circle-color': '#000'
//         },
//         filter: ['in', '$type', 'Point']
//     });
//     map.addLayer({
//         id: 'measure-lines',
//         type: 'line',
//         source: 'geojson',
//         layout: {
//             'line-cap': 'round',
//             'line-join': 'round'
//         },
//         paint: {
//             'line-color': '#000',
//             'line-width': 2.5
//         },
//         filter: ['in', '$type', 'LineString']
//     });

//     map.on('click', function (e) {
//         var features = map.queryRenderedFeatures(e.point, {
//             layers: ['measure-points']
//         });

//         // Remove the linestring from the group
//         // So we can redraw it based on the points collection
//         if (geojson.features.length > 1) geojson.features.pop();

//         // Clear the Distance container to populate it with a new value
//         distanceContainer.innerHTML = '';

//         // If a feature was clicked, remove it from the map
//         if (features.length) {
//             var id = features[0].properties.id;
//             geojson.features = geojson.features.filter(function (point) {
//                 return point.properties.id !== id;
//             });
//         } else {
//             var point = {
//                 'type': 'Feature',
//                 'geometry': {
//                     'type': 'Point',
//                     'coordinates': [e.lngLat.lng, e.lngLat.lat]
//                 },
//                 'properties': {
//                     'id': String(new Date().getTime())
//                 }
//             };

//             geojson.features.push(point);
//         }

//         if (geojson.features.length > 1) {
//             linestring.geometry.coordinates = geojson.features.map(
//                 function (point) {
//                     return point.geometry.coordinates;
//                 }
//             );

//             geojson.features.push(linestring);
//             console.log('linestring линия __>> ', linestring);
//             // Populate the distanceContainer with total distance
//             var value = document.createElement('pre');
//             var length_meters = length(linestring) * 1000
//             value.textContent =
//                 'Total distance: ' + length_meters.toLocaleString() + 'm';
//             distanceContainer.appendChild(value);
//         }
//         map.getSource('geojson').setData(geojson);
//     });
// });

// map.on('mousemove', function (e) {
//     var features = map.queryRenderedFeatures(e.point, {
//         layers: ['measure-points']
//     });
//     // UI indicator for clicking/hovering a point on the map
//     map.getCanvas().style.cursor = features.length
//         ? 'pointer'
//         : 'crosshair';
// });
