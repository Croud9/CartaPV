import maplibregl from 'maplibre-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import area from '@turf/area';
import bbox from '@turf/bbox';
import centroid from '@turf/centroid';
import { polygon, featureCollection } from '@turf/helpers';
import { calcAreaForPV, calcPVs, createPolyWithHole } from "./pv-calc.js";

document.addEventListener("turbo:load", function() {
    if (document.getElementById("map_not_display") !== null) {
      $('#select_config_pdf').empty();
      $('#form_pdf').fadeTo(500, 0);
      $('#select_project_pdf').change(function() {
        $('#select_config_pdf').empty();
        $.ajax({
          url: "get_configs_by_project",
          data: "id=" + $("#select_project_pdf option:selected").val(),
          success: null,
          dataType: "script",
        });
      });

      function get_config_params() {
        const selected_config = $("#select_config_pdf").val()
        $.ajax({
          url: "get_params_for_snapshots",
          data: {id: selected_config},
          dataType: "json",
          success: function(data) {
            console.log(data)
            drawPointInCountry(data)
          },
        });
      };

      function drawPolyPV(data) {
        const bbox_all = bbox(data.project_areas)
        const current_source_poly = map_not_display.getSource('project_area')
        if (current_source_poly === undefined) {
          map_not_display.addSource('project_area', { 'type': 'geojson', 'data': data.project_areas });
          map_not_display.addLayer({
            'id': 'project_area',
            'type': 'line',
            'source': 'project_area',
            'paint': {
              'line-color': 'rgba(255, 0, 0, 1)',
              'line-width': 2
            }
          });
        }
        else {
            current_source_poly.setData(data.project_areas );
        }
        map_not_display.fitBounds(bbox_all, {
            padding: 80,
            animate: false,
        })
        
        snapshot_PV(data, 0)
      };

      function snapshot_PV(data, i) {
        const id_area = data.project_areas.features[0].id
        const config = data.configs[i]
        params_to_num(config.configuration)  
        drawTable(config)
        const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id_area, data.project_areas.features[0], config.configuration);  
        const [all_tables, data_pv] = drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord, config.configuration);
        const squares = outputAreaData(data.project_areas.features[0], poly_for_pv);
        const total_params = {
          squares: squares, 
          all_tables: all_tables
        }

        map_not_display.once('idle', function(){
          map_not_display.getCanvas().toBlob( function (blob) {
            config['config_img'] = blob
            config['total_params'] = total_params

            // var objectURL = URL.createObjectURL(blob);
            // document.querySelector("#image_pv").src = objectURL

            deleteAreas(data.project_areas.features)
            if (i != data.configs.length - 1 ) {
              i++
              snapshot_PV(data, i)
            } else {
              saveRequestParams(data)
              console.log('закончили')
              console.log(data)
            }
          })
        })
      };

      function saveRequestParams(data) {
        const formData = new FormData();
        // formData.append('id', $("#select_config option:selected").val());
        // formData.append('data', JSON.stringify(data));
        formData.append('project_img', data.project_img);
        for (let config of data.configs) {
          config.total_params["svg"] = config.svg
          formData.append('configs[]', JSON.stringify({id: config.id, total_params: config.total_params}));
          formData.append('config_imgs[]', config.config_img);
        }

        $.ajax({
          method: 'post',
          url: 'update_files',
          data: formData,
          processData: false,
          contentType: false,
          beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
          success: function(data) { 
            $("#form_pdf").submit();
            // alert('Успешно сохранено');
            
          }
        });
      };

      function drawPointInCountry(data) {
        const center_pt = centroid(data.project_areas)

        let current_source_poly = map_not_display.getSource('pt_geolocation')
        if (current_source_poly === undefined) {
            map_not_display.addSource('pt_geolocation', { 'type': 'geojson', 'data': center_pt });
            map_not_display.addLayer({
                  'id': 'pt_geolocation',
                  'type': 'circle',
                  'source': 'pt_geolocation',
                  'layout': {},
                  'paint': {
                    'circle-radius': 6,
                    'circle-color': '#00e61f'
                  }
              });
        }
        else {
            current_source_poly.setData(center_pt);
        }

        map_not_display.flyTo({
          center: center_pt.geometry.coordinates,
          zoom: 2.5,
          animate: false,
        });

        map_not_display.once('idle',function(){
          map_not_display.getCanvas().toBlob(function (blob) {
            data['project_img'] = blob
            // var objectURL = URL.createObjectURL(blob);
            // document.querySelector("#image_project").src = objectURL
            if (map_not_display.getLayer('pt_geolocation')) {
              map_not_display.removeLayer('pt_geolocation');
            }
            if (map_not_display.getSource('pt_geolocation')) {
              map_not_display.removeSource('pt_geolocation');
            }

            reverseGeocode(center_pt.geometry.coordinates).then(function(result) {
              console.log(result.address)
              console.log(result.address.display_name)
              // here you can use the result of promiseB
            });
            drawPolyPV(data)
          })
        })
      };

      async function reverseGeocode(coord) {
        let address = null;
        try {
            let request = 
              'https://nominatim.openstreetmap.org/reverse?' + 
              'lat=' + coord[1] + 
              '&lon=' + coord[0] + 
              '&format=json';
            let options = {
              headers: {
                'User-Agent': 'CartaPV/service/website/etc. v0.1'
              }
            };

            const response = await fetch(request, options);
            address = await response.json();
        } catch (e) {
            console.error(`Failed to forwardGeocode with error: ${e}`);
        }
        return { address: address };
      }
      
      function outputAreaData(project_area, poly_for_pv) {
        let squares = {
          all_area: {meters: null, hectares: null}, 
          pv_area: {meters: null, hectares: null}
        };

        let [rounded_area_ga, rounded_area_m] = calcSquareArea(project_area);
        squares.all_area.meters = rounded_area_m
        squares.all_area.hectares = rounded_area_ga
        let [round_area_ga, round_area_m] = calcSquareArea(poly_for_pv);
        squares.pv_area.meters = round_area_m
        squares.pv_area.hectares = round_area_ga
        return squares
      };

      function calcSquareArea(poly_area) {
        const square = area(poly_area);
        const rounded_area_ga = Math.round((square / 10000) * 100) / 100;
        const rounded_area_m = Math.round(square * 100) / 100;
        return [rounded_area_ga, rounded_area_m]
      };

      $("#btn_pdf").click(function(e) {
        let isFormValid = $('#form_pdf')[0].checkValidity();
        if(!isFormValid) {
          $('#form_pdf')[0].reportValidity();
        } else {
          e.preventDefault();
          get_config_params()
        }
      });

      function params_to_num(params) {
        params.offset_pv = +params.offset_pv;
        params.distance_to_barrier = +params.distance_to_barrier;
        params.distance_to_pv_area = +params.distance_to_pv_area;
        params.height_offset_tables = +params.height_offset_tables;
        params.width_offset_tables = +params.width_offset_tables;
        params.angle_from_azimut = +params.angle_from_azimut;
        params.angle_fix = +params.angle_fix;
        params.column_pv_in_table = +params.column_pv_in_table;
        params.row_pv_in_table = +params.row_pv_in_table;
        params.width_table = +params.width_table;
        params.height_table = +params.height_table;
      }

      function deleteAreas(features) {
        features.forEach((item) => { 
            const id = `poly_for_pv${item.id}`
            const id_pvs = `pvs${item.id}`
            const id_pvs_poly = `pvs_poly${item.id}`
            const id_pvs_line = `pvs_line${item.id}`
            const id_pvs_dash_line = `pvs_dash_line${item.id}`

            if (map_not_display.getLayer(id)) {
                map_not_display.removeLayer(id);
            }
            if (map_not_display.getSource(id)) {
                map_not_display.removeSource(id);
            }
            if (map_not_display.getLayer(id_pvs_poly)) {
                map_not_display.removeLayer(id_pvs_poly);
            }
            if (map_not_display.getLayer(id_pvs_line)) {
                map_not_display.removeLayer(id_pvs_line);
            }
            if (map_not_display.getLayer(id_pvs_dash_line)) {
                map_not_display.removeLayer(id_pvs_dash_line);
            }
            if (map_not_display.getSource(id_pvs)) {
                map_not_display.removeSource(id_pvs);
            }
        });
    }

      function drawAreaForPV(id_area, main_area, config) {
        let poly_for_pv, top_coord, lower_coord, left_coord, right_coord, large_area
        const start_area = main_area
        const all_areas = start_area.geometry.coordinates

        if (all_areas.length > 1) {
            let square = 0
            all_areas.forEach((item) => { 
                if (area(polygon(item)) > square) {
                    square = area(polygon(item))
                    large_area = polygon(item)
                }
            });
            [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(large_area, config)
            poly_for_pv = createPolyWithHole(poly_for_pv.geometry.coordinates, large_area.geometry.coordinates, all_areas)
        }
        else if (all_areas.length == 1) {
            [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(start_area, config)
        }
        if (area(poly_for_pv) < 0) alert('Полезная площадь слишком мала')

        setAreaPolyOnMap(id_area, poly_for_pv)

        return [poly_for_pv, top_coord, lower_coord, left_coord, right_coord]
    }

    function drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord, config) {
        const [lines_for_PV , all_tables] = calcPVs(poly_for_pv, top_coord, lower_coord, left_coord, right_coord, config);
        
        setPVPolyOnMap(id_area, lines_for_PV)

        return [all_tables, lines_for_PV]
    }

    function setAreaPolyOnMap(id_area, data) {
      let current_source_poly = map_not_display.getSource(`poly_for_pv${id_area}`)
      if (current_source_poly === undefined) {
        map_not_display.addSource(`poly_for_pv${id_area}`, { 'type': 'geojson', 'data': data });
        map_not_display.addLayer({
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
          current_source_poly.setData(data);
      }
    }

    function setPVPolyOnMap(id_area, data) {
      let current_source_pvs = map_not_display.getSource(`pvs${id_area}`);
      if (current_source_pvs === undefined) {
        map_not_display.addSource(`pvs${id_area}`, {
              'type': 'geojson',
              'data': {
                  'type': 'FeatureCollection',
                  'features': data
              }
          });
          map_not_display.addLayer({
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
          map_not_display.addLayer({
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
          map_not_display.addLayer({
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
              'features': data
          });
      }
    };

    var map_not_display = new maplibregl.Map({
      container: 'map_not_display',
      zoom: 3,
      center: [100, 65],
      style:
      'https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd', // Актуальные, бесшовные изображения для всего мира с учетом контекста
      // 'https://api.maptiler.com/maps/3f98f986-5df3-44da-b349-6569ed7b764c/style.json?key=QA99yf3HkkZG97cZrjXd' //Идеальная карта для активного отдыха
      // 'https://api.maptiler.com/maps/975e75f4-3585-4226-8c52-3c84815d6f2a/style.json?key=QA99yf3HkkZG97cZrjXd', // Идеальная базовая карта местности с контурами и заштрихованным рельефом.
      preserveDrawingBuffer: true
      // antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
    });

    map_not_display.on('load', function () {
      $('#form_pdf').fadeTo(500, 1);
      map_not_display.resize();
    });

    function drawTable(config) {
        let x_start = 0;
        let y_start = 0;
        let col_tables = config.configuration.column_pv_in_table;
        let row_tables = config.configuration.row_pv_in_table;
        const offset_tables = config.configuration.offset_pv;
        const params = {
            w_cell: 10,
            h_cell: 10,
            col_cells: 4,
            row_cells: 7,
            width_pv: 0,
            height_pv: 0,
            scale: 1,
        };

        if (config.configuration.type_table == 'fix') {
            [col_tables, row_tables] = [row_tables, col_tables]
        }

        if (config.configuration.orientation == 'horizontal') {
            [params.col_cells, params.row_cells] = [params.row_cells, params.col_cells]
        };

        params.width_pv = params.w_cell * params.col_cells + 0.5 * (params.col_cells - 1)
        params.height_pv = params.h_cell * params.row_cells + 0.5 * (params.row_cells - 1)
        const width_table = params.width_pv * col_tables + offset_tables * (col_tables - 1);
        const height_table = params.height_pv * row_tables + offset_tables * (row_tables - 1);

        const svg = Snap(width_table, height_table);
        svg.attr("display", "none");
        svg.attr({ viewBox: '0 0' + ' ' + width_table + ' ' +  height_table});
        const frame_table = svg.rect(x_start, y_start, width_table, height_table);
        frame_table.attr({
            fillOpacity: 0.1,
            fill: '#3d3d3d',
        });
        params['table'] = svg.group()
        params.table.add(frame_table)
    
        for (let col = 0; col < col_tables; col++) {
            for (let row = 0; row < row_tables; row++) {
                drawPV(x_start + (params.width_pv + offset_tables) * col, 
                        y_start + (params.height_pv + offset_tables) * row, params, svg);
            };
        };
        // params.table.transform('s' + params.scale +  ' 0 0');
        config['svg'] = {
          img: svg.outerSVG(),
          width: width_table,
          height: height_table,
        }
    };

    function drawPV(x_start, y_start, params, svg) {
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
  };
})
