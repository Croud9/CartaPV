import area from '@turf/area';
import maplibregl from 'maplibre-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxElevationControl from "@watergis/mapbox-gl-elevation";
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import { calcAreaForPV, calcPVs } from "./pv-calc.js";
import mask from '@turf/mask';
import difference from '@turf/difference';
import intersect from '@turf/intersect';
import booleanWithin from '@turf/boolean-within';
import { multiLineString, lineString, polygon, point, multiPolygon } from '@turf/helpers';

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

var draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
        polygon: true,
        combine_features: true,
        uncombine_features: true,
        // trash: true,
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
map.on('draw.create', updateArea);
map.on('draw.delete', updateArea);
map.on('draw.update', updateArea);
map.on('draw.combine', combineArea);

function createPolyWithHole(l_area_for_pv, l_area, union_areas){
    console.log('l_area_for_pv -- >', l_area_for_pv)
    console.log('l_area -- >', l_area)
    const xy_poly_with_holes = [l_area_for_pv[0]] 
    union_areas.forEach((item) => { 
        if (l_area.toString() !== item.toString()) {
            const hole_intersect = intersect(polygon(item), polygon(l_area_for_pv));
            if (hole_intersect != null) {
                console.log('hole_intersect', hole_intersect.geometry.coordinates[0])
                xy_poly_with_holes.push(hole_intersect.geometry.coordinates[0]) 
            }
        };
    });
    let poly_for_pv
    poly_for_pv = polygon(xy_poly_with_holes)
    return poly_for_pv
}

function combineArea(e){
    const id_union_area = e.createdFeatures[0].id
    let union_areas = e.createdFeatures[0].geometry.coordinates
    let l_area_for_pv, l_area, large_area
    let square = 0
    e.deletedFeatures.forEach((item) => { 
        const id = `poly_for_pv${item.id}`
        const id_pvs = `pvs${item.id}`
        const id_pvs_poly = `pvs_poly${item.id}`
        const id_pvs_line = `pvs_line${item.id}`

        if (area(item) > square) {
            square = area(item)
            l_area = item.geometry.coordinates
            l_area_for_pv = map.getSource(id)["_data"].geometry.coordinates
        }
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
        if (map.getSource(id_pvs)) {
        map.removeSource(id_pvs);
        }
    });
    if (l_area.length > 1) {
        square = 0
        l_area.forEach((item) => { 
            if (area(polygon(item)) > square) {
                square = area(polygon(item))
                large_area = item
            }
        });
    }
    else {
        large_area = l_area
    }
    let poly_for_pv = createPolyWithHole(l_area_for_pv, large_area, union_areas)

    map.addSource(`poly_for_pv${id_union_area}`, { 'type': 'geojson', 'data': poly_for_pv });
    map.addLayer({
        'id': `poly_for_pv${id_union_area}`,
        'type': 'fill',
        'source': `poly_for_pv${id_union_area}`,
        'layout': {},
        'paint': {
            'fill-color': '#00cc55',
            'fill-opacity': 0.7
        }
    });
}

function drawPVs(e, id_area, square_text, answer) {
    let poly_for_pv, top_coord, lower_coord, left_coord, right_coord, large_area
    const start_area = draw.get(id_area)

    const all_areas = start_area.geometry.coordinates
    if (all_areas.length > 1) {
        let square = 0
        all_areas.forEach((item) => { 
            if (area(polygon(item)) > square) {
                square = area(polygon(item))
                large_area = item
            }
        });
        large_area = polygon(large_area)
        const area_params = calcAreaForPV(large_area)
        poly_for_pv = area_params[0]
        top_coord = area_params[1]
        lower_coord = area_params[2]
        left_coord = area_params[3]
        right_coord = area_params[4]
        poly_for_pv = createPolyWithHole(poly_for_pv.geometry.coordinates, large_area.geometry.coordinates, all_areas)

    }
    else if (all_areas.length == 1) {
        [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(start_area)
    }
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
                'line-color': '#fff', //'#B42222'
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
        // map.addLayer({
        //     'id': `pvs_point${id_area}`,
        //     'type': 'circle',
        //     'source': `pvs${id_area}`,
        //     'paint': {
        //         'circle-radius': 6,
        //         'circle-color': '#fff'
        //     },
        //     'filter': ['==', '$type', 'Point']
        // });
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
        drawPVs(e, id_area, square_text, answer);
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
