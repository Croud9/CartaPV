import area from '@turf/area';
import mask from '@turf/mask';
import difference from '@turf/difference';
import booleanWithin from '@turf/boolean-within';
import { multiLineString, lineString, polygon, point, multiPolygon } from '@turf/helpers';
import maplibregl from 'maplibre-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxElevationControl from "@watergis/mapbox-gl-elevation";
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import { calcAreaForPV, calcPVs, createPolyWithHole } from "./pv-calc.js";

// import { MapboxStyleDefinition, MapboxStyleSwitcherControl } from "mapbox-gl-style-switcher";
// import { style } from "./switcher";

const check_border_lines = document.getElementById('check-visible-border-lines');
const check_dash_lines = document.getElementById('check-visible-dash-lines');
const check_pv_polygons = document.getElementById('check-visible-pv-polygons');
const answer = document.getElementById('calculated-area');
const draw_area = document.getElementById('btn-draw-area');
const draw_pv = document.getElementById('btn-draw-pv');
const form_config = document.getElementById('data');
form_config.addEventListener('submit', handleFormSubmit);
draw_area.addEventListener('click', clickDrawArea);
draw_pv.addEventListener('click', clickDrawPV);
check_border_lines.addEventListener('change', visibilityLayout);
check_dash_lines.addEventListener('change', visibilityLayout);
check_pv_polygons.addEventListener('change', visibilityLayout);

let params = {
    distance_to_barrier: 20,
    distance_to_pv_area: 20,
    height_table: 1.640,
    width_table: 9.920,
    height_offset_tables: 10,
    width_offset_tables: 20,
    angle_from_azimut: 90,
    align_row_tables: 'center',
    type_table: 'tracker',
    orientation: 'vertical',
    angle_fix: 0,
    column_pv_in_table: 1,
    row_pv_in_table: 1,
}

function visibilityLayout(event) {
    const layers_ids = {
        'check-visible-border-lines': 'pvs_line',
        'check-visible-dash-lines': 'pvs_dash_line',
        'check-visible-pv-polygons': 'pvs_poly',
    };
    const all_ids = [];
    const all_data = draw.getAll();

    if (all_data.features.length > 0) { all_data.features.forEach((item) => { all_ids.push(item.id) })};
    
    all_ids.forEach((item) => {
        const id_layer = layers_ids[event.target.id] + item
        if (map.getLayer(id_layer)) {
            map.setLayoutProperty(
                id_layer,
                'visibility',
                event.target.checked ? 'visible' : 'none'
            );
        }
    });
};

function clickDrawArea(event) { 
    const selected_ids = draw.getSelectedIds();
    if (selected_ids.length != 0) {
        selected_ids.forEach((item) => {
            const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(item);  
            // const all_tables = drawPVs(item, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
            // outputAreaData(item, poly_for_pv, all_tables);
        });
    };
};

function clickDrawPV(event) {
    const selected_ids = draw.getSelectedIds();
    if (selected_ids.length != 0) {
        selected_ids.forEach((item) => {
            const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(item);  
            const all_tables = drawPVs(item, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
            outputAreaData(item, poly_for_pv, all_tables);
        });
    };
};

function serializeForm(formNode) {
    return new FormData(formNode)
}

function handleFormSubmit(event) {
    event.preventDefault()
    let width_pv = 2 
    let height_pv = 1
    const dataForm = serializeForm(event.target);

    // console.log('dataForm --- >>> ', dataForm.get("align-tables"))
    // for (let [key, value] of dataForm) {
    //     console.log(`${key} - ${value}`)
    // }

    let count_column_pv = +dataForm.get("count-column-pv");
    let count_row_pv = +dataForm.get("count-row-pv");
    const offset_pv = +dataForm.get("offset-pv") / 100;

    params.distance_to_barrier = +dataForm.get("distance-to-barrier");
    params.distance_to_pv_area = +dataForm.get("distance-to-pv-area");
    params.height_offset_tables = +dataForm.get("height-offset-tables");
    params.width_offset_tables = +dataForm.get("width-offset-tables");
    params.angle_from_azimut = +dataForm.get("angle-from-azimut");
    params.align_row_tables = dataForm.get("align-tables");
    params.type_table = dataForm.get("type-table");
    params.angle_fix = +dataForm.get("angle-fix");
    params.orientation = dataForm.get("orientation");

    [count_column_pv, count_row_pv] = [count_row_pv, count_column_pv];

    if (params.type_table == 'tracker') {
        params.orientation =  (params.orientation == 'vertical') ? 'horizontal' : 'vertical'
    };

    if (params.orientation == 'vertical') {
        [width_pv, height_pv] = [height_pv, width_pv];
    };
    
    params.column_pv_in_table = count_column_pv;
    params.row_pv_in_table = count_row_pv;

    params.width_table = count_column_pv * width_pv + offset_pv * (count_column_pv - 1);
    params.height_table = count_row_pv * height_pv + offset_pv * (count_row_pv - 1);

    if (params.height_offset_tables < params.height_table) 
    alert('Расстояние меньше высоты стола, измените');

    // const selected_ids = draw.getSelectedIds();
    // if (selected_ids.length != 0) {
    //     selected_ids.forEach((item) => {
    //         const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(item);  
    //         const all_tables = drawPVs(item, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
    //         outputAreaData(item, poly_for_pv, all_tables);
    //     });
    // };
}

function calcSquareArea(poly_area) {
    const square = area(poly_area);
    const rounded_area_ga = Math.round((square / 10000) * 100) / 100;
    const rounded_area_m = Math.round(square * 100) / 100;
    return [rounded_area_ga, rounded_area_m]
}

function outputAreaData(id_area_initial, poly_for_pv) {
    let [rounded_area_ga, rounded_area_m] = calcSquareArea(draw.get(id_area_initial));
    const square_text = 'Площадь области: <strong>' + 
    rounded_area_ga + 
    '</strong> га / <strong>' + 
    rounded_area_m + 
    '</strong> м²';
      
    [rounded_area_ga, rounded_area_m] = calcSquareArea(poly_for_pv);
    const square_pv_area = 'Полезная площадь: <strong>' + 
                            rounded_area_ga + 
                            '</strong> га / <strong>' + 
                            rounded_area_m + 
                            '</strong> м²';           
    answer.innerHTML = square_text + '<p> ' + square_pv_area + '</p>' // + '<p>Столов: <strong>' + all_tables + ' </strong>шт.</p>'
}
  
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

var draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
        polygon: true,
        combine_features: true,
        uncombine_features: true,
        trash: true,
    }
});

var geocoder_api = {
    forwardGeocode: async (config) => {
        const features = [];
        try {
            let request =
                'https://nominatim.openstreetmap.org/search?q=' +
                config.query +
                '&format=geojson&polygon_geojson=1&addressdetails=1';
            const response = await fetch(request);
            const geojson = await response.json();
            for (let feature of geojson.features) {
                let center = [
                    feature.bbox[0] +
                        (feature.bbox[2] - feature.bbox[0]) / 2,
                    feature.bbox[1] +
                        (feature.bbox[3] - feature.bbox[1]) / 2
                ];
                let point = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: center
                    },
                    place_name: feature.properties.display_name,
                    properties: feature.properties,
                    text: feature.properties.display_name,
                    place_type: ['place'],
                    center: center
                };
                features.push(point);
            }
        } catch (e) {
            console.error(`Failed to forwardGeocode with error: ${e}`);
        }

        return {
            features: features
        };
    }
};

map.addControl(
    new MaplibreGeocoder(geocoder_api, {
        maplibregl: maplibregl
    })
);
map.addControl(new maplibregl.FullscreenControl());
map.addControl(
    new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true
    })
);
map.addControl(draw);
// map.on('draw.create', updateArea);
map.on('draw.delete', updateArea);
map.on('draw.update', updateArea);
map.on('draw.combine', combineArea);
map.on('draw.uncombine', uncombineAreas);

function deleteAreas(features) {
    features.forEach((item) => { 
        const id = `poly_for_pv${item.id}`
        const id_pvs = `pvs${item.id}`
        const id_pvs_poly = `pvs_poly${item.id}`
        const id_pvs_line = `pvs_line${item.id}`
        const id_pvs_dash_line = `pvs_dash_line${item.id}`

        if (map.getLayer(id)) {
            map.removeLayer(id);
        }
        if (map.getSource(id)) {
            map.removeSource(id);
        }
        if (map.getLayer(id_pvs_poly)) {
            map.removeLayer(id_pvs_poly);
        }
        if (map.getLayer(id_pvs_line)) {
            map.removeLayer(id_pvs_line);
        }
        if (map.getLayer(id_pvs_dash_line)) {
            map.removeLayer(id_pvs_dash_line);
        }
        if (map.getSource(id_pvs)) {
            map.removeSource(id_pvs);
        }
    });
}

function uncombineAreas(e){
    deleteAreas(e.deletedFeatures)
}

function combineArea(e){
    const id_union_area = e.createdFeatures[0].id
    deleteAreas(e.deletedFeatures)
    const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id_union_area);
    outputAreaData(id_union_area, poly_for_pv);
    // const all_tables = drawPVs(id_union_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
}

function drawAreaForPV(id_area) {
    let poly_for_pv, top_coord, lower_coord, left_coord, right_coord, large_area
    const start_area = draw.get(id_area)
    const all_areas = start_area.geometry.coordinates

    if (all_areas.length > 1) {
        let square = 0
        all_areas.forEach((item) => { 
            if (area(polygon(item)) > square) {
                square = area(polygon(item))
                large_area = polygon(item)
            }
        });
        [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(large_area, params)
        poly_for_pv = createPolyWithHole(poly_for_pv.geometry.coordinates, large_area.geometry.coordinates, all_areas)
    }
    else if (all_areas.length == 1) {
        [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(start_area, params)
    }
    if (area(poly_for_pv) < 0) alert('Полезная площадь слишком мала')
    const current_source_poly = map.getSource(`poly_for_pv${id_area}`)
    if (current_source_poly === undefined) {
        map.addSource(`poly_for_pv${id_area}`, { 'type': 'geojson', 'data': poly_for_pv });
        map.addLayer({
            'id': `poly_for_pv${id_area}`,
            'type': 'fill',
            'source': `poly_for_pv${id_area}`,
            'layout': {},
            'paint': {
                'fill-color': '#00cc55',
                'fill-opacity': 0.7
            }
        });
    }
    else {
        current_source_poly.setData(poly_for_pv);
    }
    return [poly_for_pv, top_coord, lower_coord, left_coord, right_coord]
}

function drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord) {
    const [lines_for_PV , all_tables] = calcPVs(poly_for_pv, top_coord, lower_coord, left_coord, right_coord, params);
    const current_source_pvs = map.getSource(`pvs${id_area}`);

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
                'line-cap': 'round',
                'visibility': 'none'
            },
            'paint': {
                'line-color': '#fff', //'#B42222'
                'line-width': 1
            },
            'filter': ['==', 'name', 'borderline']
        });
        map.addLayer({
            'id': `pvs_dash_line${id_area}`,
            'type': 'line',
            'source': `pvs${id_area}`,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round',
                'visibility': 'visible'
            },
            'paint': {
                'line-dasharray': [3, 3],
                'line-color': '#fff', //'#B42222'
                'line-width': 1
            },
            'filter': ['==', 'name', 'dashline']
        });
        map.addLayer({
            'id': `pvs_poly${id_area}`,
            'type': 'fill',
            'source': `pvs${id_area}`,
            'layout': {
                'visibility': 'visible'
            },
            'paint': {
                'fill-color': '#3333ff',
                'fill-opacity': 0.4,
                // 'fill-pattern': 'pattern'
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
    return all_tables
}

function updateArea(e) {
    const id_area = e.features[0].id
    const all_data = draw.getAll();
    
    if (all_data.features.length > 0) {
        // const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id_area);    
        // outputAreaData(id_area, poly_for_pv);
        // const all_tables = drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
    } else {
        answer.innerHTML = '';
        if (e.type !== 'draw.delete') {
            alert('Use the draw tools to draw a polygon!');
        }
        else {
            deleteAreas(e.features)
        }
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
