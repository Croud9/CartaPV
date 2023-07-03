import maplibregl from 'maplibre-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import area from '@turf/area';
import bbox from '@turf/bbox';
import pointGrid from '@turf/point-grid';
import centroid from '@turf/centroid';
import length from '@turf/length';
import { kml } from '@tmcw/togeojson'; 
import { polygon, featureCollection } from '@turf/helpers';
import { turbo_message } from "./flash_message.js";
import { calcAreaForPV, calcPVs, createPolyWithHole, createRectPolygon } from "./pv-calc.js";
import { ElevationProvider } from "./elevationProvider.js";

document.addEventListener("turbo:load", function() {
    if (document.getElementById("map") !== null) {
      // $('.map_options').fadeOut();
      
        var draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                combine_features: true,
                uncombine_features: true,
                trash: true,
                point: true
            }
        });
        let style_bing_map, global_params, image_plane_URL

        // let elevationArea = []
        // const terrain_style = {
        //   version: 8,
        //   name: "OSM Mecklenburg GeoPortal",
        //   // maxPitch: 70,
        //   // zoom: 13.5,
        //   // center: [-80.846, 35.223],
        //   sources: {
        //     osm: {
        //       type: "raster",
        //       tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        //       tileSize: 256,
        //       attribution: "&copy; OpenStreetMap Contributors",
        //       maxzoom: 19
        //     },
        //     hillshade_source: {
        //      type: "raster-dem",
        //       encoding: "terrarium",
        //       tiles: [
        //         "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        //       ],
        //       tileSize: 256,
        //       minzoom: 0,
        //       maxzoom: 14
        //     },
        //     terrain_source: {
        //       type: "raster-dem",
        //       encoding: "terrarium",
        //       tiles: [
        //         "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        //       ],
        //       tileSize: 256,
        //       minzoom: 0,
        //       maxzoom: 14
        //     }
        //   },
        //   layers: [
        //     {
        //       id: "osm",
        //       type: "raster",
        //       source: "osm"
        //     },
        //     {
        //       id: "hills",
        //       type: "hillshade",
        //       source: "hillshade_source",
        //       layout: { visibility: 'visible' },
        //       paint: { 'hillshade-shadow-color': '#473B24' }
        //     }
        //   ],
        //   terrain: {
        //     source: 'terrain_source',
        //     exaggeration: 5
        //   }
        // }

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

        initBingMaps()
        var distanceContainer = document.getElementById('distance');
        var geojson = {
          'type': 'FeatureCollection',
          'features': []
        };
        
        var linestring = {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': []
            }
        };

        const apiKey = 'QA99yf3HkkZG97cZrjXd';
        const elevationProvider = new ElevationProvider(apiKey);

        const btn_distance = $("#btn-draw-distance");
        const check_border_lines = document.getElementById('check-visible-border-lines');
        const check_dash_lines = document.getElementById('check-visible-dash-lines');
        const check_pv_polygons = document.getElementById('check-visible-pv-polygons');
        const calculated_area = document.getElementById('calculated-area');
        const draw_area = document.getElementById('btn-draw-area');
        const draw_pv = document.getElementById('btn-draw-pv');
        const form_config = document.getElementById('data');
        const field_image_file = document.getElementById("load_image_file")
        form_config.addEventListener('submit', handleFormSubmit);
        draw_area.addEventListener('click', clickDrawArea);
        draw_pv.addEventListener('click', clickDrawPV );
        check_border_lines.addEventListener('change', visibilityLayout);
        check_dash_lines.addEventListener('change', visibilityLayout);
        check_pv_polygons.addEventListener('change', visibilityLayout);
        field_image_file.addEventListener("change", handleFiles);
        btn_distance.click(distance_btn_logic);
        $("#btn_set_grid").click(get_selected_polygon);
        $("#btn_get_elevation").click(getRelief);
        $("#btn_create_rect").click(create_rect);
        $("#btn-load-image").click(set_image_on_map);
        $("#btn_load_kml").click(load_kml);
        $('#select_config').change(get_config_params);
        $('#select_project').change(set_project_area);
        $("#type-table2").click(function () {
          $('#angle-from-azimut').val(global_params.angle_from_azimut);
          $('#rangevalue2').text(global_params.angle_from_azimut);
        })
        $("#style_map_satellite").click(function () {
          map.setStyle('https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd')
          distance_btn_logic(true)
        })
        $("#style_map_streets").click(function () {
          map.setStyle(style_bing_map)
          distance_btn_logic(true)
        })
        $("#style_map_outdoors").click(function () {
          map.setStyle('https://api.maptiler.com/maps/975e75f4-3585-4226-8c52-3c84815d6f2a/style.json?key=QA99yf3HkkZG97cZrjXd')
          distance_btn_logic(true)
        })
      
        const scale = new maplibregl.ScaleControl();
        var map = new maplibregl.Map({
                container: 'map',
                zoom: 1.75,
                center: [45, 65],
                maxPitch: 70,
                fadeDuration: 0,
                validateStyle: false,
                style:
                'https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd',
        }); 
      
        map.on('draw.delete', updateArea);
        map.on('draw.update', updateArea);
        map.on('draw.combine', combineArea);
        map.on('draw.uncombine', uncombineAreas);
        map.on('click', measure_distance);
        map.on('mousemove', change_cursor);

        map.on('load', function () {
          $('#map_styles').fadeTo(500, 1);
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
          map.addControl(scale);
          map.addControl(draw);
          btn_distance.fadeTo(500, 1)
          $('#btn-load-image').fadeTo(500, 1)
          $('.map_options').fadeTo(500, 1);
        });

        map.on('draw.modechange', function (e) {
          const cursor = (e.mode == 'draw_polygon' || e.mode == 'draw_point') ? 'crosshair' : '';
          map.getCanvas().style.cursor = cursor;
        });
        
        map.on('draw.selectionchange', function (e) {
          if (e.features.length != 0) map.getCanvas().style.cursor = '';
        });

        function set_project_area() {
          if ($('#select_project option:selected').text() != "Выберите") {
            $.ajax({
              url: "get_project_params",
              data: "id=" + $("#select_project option:selected").val(),
              dataType: "json",
              success: function(data) {
                deleteAreas(draw.getAll().features)
                draw.deleteAll()
                if (data !== null) {
                  data.features.forEach((area) => {
                    draw.add(area)
                  });
                  const bbox_all = bbox(data)
                  map.fitBounds(bbox_all, {
                      padding: 80,
                      animate: true,
                  })
                  calculated_area.innerHTML = ''
                }
              },
            });
          };
        };
        
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
            calculated_area.innerHTML = ''
            let all_data = []
            let areas = []
            const selected_ids = draw.getSelectedIds();
            if (selected_ids.length != 0) {
              try {
                selected_ids.forEach((id) => {
                  const map_feature = draw.get(id)
                  if (map_feature.geometry.type == "MultiPolygon" || map_feature.geometry.type == "Polygon") {
                    const [poly_for_pv] = drawAreaForPV(id);
                    if (poly_for_pv == 'error_square') {
                      window.Turbo.renderStreamMessage(turbo_message('error', 'Полезная площадь равна 0, измените параметры участка'));
                    } else if (poly_for_pv == 'error_hole') {
                      window.Turbo.renderStreamMessage(turbo_message('error', 'Область исключения не должна полностью пересекать полезную площадь'));
                    } else {
                      let feature = {idx: id, poly_features: poly_for_pv, pv_features: null}
                      all_data.push(feature)
                      areas.push(map_feature)
                      outputAreaData(id, poly_for_pv)

                      const offset_pt = +$('#offset_pt').val()
                    }
                  } else {
                    window.Turbo.renderStreamMessage(turbo_message('info', 'Приложение работает только с полигонами'));
                  };
                });
              } catch (e) {
                console.log(e.stack)
                window.Turbo.renderStreamMessage(turbo_message(
                  'error', 
                  `Произошла ошибка при отрисовке области под ФЭМ: ${e};`
                ));
                return;
              }

              $.ajax({
                method: 'post',
                url: 'update_configuration',
                data: {
                  id: $("#select_config option:selected").val(), 
                  project_areas: JSON.stringify(featureCollection(areas)), 
                  geojsons: JSON.stringify(all_data)
                },
                beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
                // success: function(data) { window.Turbo.renderStreamMessage(data);}
              });
            }
            else {
              window.Turbo.renderStreamMessage(turbo_message('info', 'Не выбрана область'));
            }
        };

        function clickDrawPV(event) {
          calculated_area.innerHTML = ''
          let all_data = []
          let total_params = {}
          let areas = []
          const selected_ids = draw.getSelectedIds();
          // draw.changeMode('simple_select')
          if (selected_ids.length != 0) {
            if ($('#select-pv-modules option:selected').text() != "Выберите") {
              $('#loader').fadeTo(500, 1, function() {
                try {
                  selected_ids.forEach((id) => {
                      const map_feature = draw.get(id)
                      if (map_feature.geometry.type == "MultiPolygon" || map_feature.geometry.type == "Polygon") {
                        const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id);
                        if (poly_for_pv == 'error_square') {
                          window.Turbo.renderStreamMessage(turbo_message('error', 'Полезная площадь равна 0, измените параметры участка'));
                        } else if (poly_for_pv == 'error_hole') {
                          window.Turbo.renderStreamMessage(turbo_message('error', 'Область исключения не должна полностью пересекать полезную площадь'));
                        } else {
                          const squares = outputAreaData(id, poly_for_pv)
                          if (squares.pv_area.hectares > 1600) {
                            window.Turbo.renderStreamMessage(turbo_message('error', 'Большой участок! Приложение обрабатывает участки с полезной площадью до 1600 га'));
                          } else {
                            const [all_tables, data_pv] = drawPVs(id, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
                            let feature = {idx: id, poly_features: poly_for_pv, pv_features: null}
                            // let feature = {idx: id, poly_features: poly_for_pv, pv_features: data_pv} // очень долго
                            areas.push(map_feature)
                            all_data.push(feature)
                            const squares = outputAreaData(id, poly_for_pv);
                            total_params = {squares: squares, all_tables: all_tables}
                          }
                        };
                      } else {
                        window.Turbo.renderStreamMessage(turbo_message('info', 'Приложение работает только с полигонами'));
                      };
                  });
                } catch (e) {
                  console.log(e.stack)
                  $('#loader').fadeTo(500, 0, function() {
                    $('#loader').hide()
                  });
                  window.Turbo.renderStreamMessage(turbo_message(
                    'error', 
                    `Произошла ошибка при отрисовке ФЭМ: ${e};
                    Временное решение: Изменить угол относительно азимута / 
                    Изменить нижнюю (при 90°) или левую границу (при 0°/180°) области, сгладить угловатые выступы / 
                    Изменить конфигурацию стола`
                  ));
                  return;
                }
                const bbox_all = bbox(draw.getAll())
                map.fitBounds(bbox_all, {padding: 80})
  
                const formData = new FormData();
                formData.append('id', $("#select_config option:selected").val());
                formData.append('project_areas', JSON.stringify(featureCollection(areas)));
                formData.append('geojsons', JSON.stringify(all_data));
                formData.append('total_params', JSON.stringify(total_params));
  
                $.ajax({
                  method: 'post',
                  url: 'update_configuration',
                  data: formData,
                  processData: false,
                  contentType: false,
                  beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
                  // success: function(data) {window.Turbo.renderStreamMessage(data);}
                });
                map.once('idle', function(){
                  $('#loader').fadeTo(500, 0,function() {
                    $('#loader').hide()
                  });
                });
              });
            }
            else {
              window.Turbo.renderStreamMessage(turbo_message('info', 'Не выбран фотоэлектрический модуль! Выберите и сохраните конфигурациюь'));
            }
          }
          else {
            window.Turbo.renderStreamMessage(turbo_message('info', 'Не выбрана область'));
          }
        };

        function serializeForm(formNode) {
            return new FormData(formNode)
        };

        function get_config_params() {
          if ($('#select_config option:selected').text() != "Выберите") {
            $.ajax({
              url: "get_config_params",
              data: "id=" + $("#select_config option:selected").val(),
              success: function(data) {
                deleteAreas(draw.getAll().features)
                if (data.geojson !== null) {
                  data.geojson.forEach((json) => {
                    setAreaPolyOnMap(json.idx, json.poly_features)
                    calculated_area.innerHTML = ''
                    // if (json.pv_featuren !== null) setPVPolyOnMap(json.idx, json.pv_features) 
                  });
                }
                global_params = data.configuration
                params_to_num()
              },
              dataType: "json",
            });
          };
        };

        function params_to_num() {
          global_params.offset_pv = +global_params.offset_pv;
          global_params.distance_to_barrier = +global_params.distance_to_barrier;
          global_params.distance_to_pv_area = +global_params.distance_to_pv_area;
          global_params.height_offset_tables = +global_params.height_offset_tables;
          global_params.width_offset_tables = +global_params.width_offset_tables;
          global_params.angle_from_azimut = +global_params.angle_from_azimut;
          global_params.angle_fix = +global_params.angle_fix;
          global_params.column_pv_in_table = +global_params.column_pv_in_table;
          global_params.row_pv_in_table = +global_params.row_pv_in_table;
          global_params.width_table = +global_params.width_table;
          global_params.height_table = +global_params.height_table;
        };

        function handleFormSubmit(event) {
            event.preventDefault()
            const dataForm = serializeForm(event.target);
            let current_module_params, params
            params = {
              distance_to_barrier: 0,
              distance_to_pv_area: 0,
              module_id: null,
              height_table: 0,
              width_table: 0,
              column_pv_in_table: 0,
              row_pv_in_table: 0,
              offset_pv: 0,
              orientation: 'vertical',
              type_table: 'tracker',
              angle_fix: 0,
              height_offset_tables: 0,
              width_offset_tables: 0,
              align_row_tables: 'center',
              angle_from_azimut: 0,
            }

            const selected_id = +dataForm.get("select-pv-modules");
            if (selected_id != 0) {
              const modules_params = $('#params_modules').data('temp')
              
              for(let i = 0; i < modules_params.length; i++) {
                if(modules_params[i].id == selected_id) 
                  current_module_params = modules_params[i]
              };
              
              // const power = current_module_params.power // короткая сторона
              let width_pv = current_module_params.height // длинная сторона
              let height_pv = current_module_params.width // короткая сторона
              let count_column_pv = +dataForm.get("count-column-pv");
              let count_row_pv = +dataForm.get("count-row-pv");

              params.module_id = dataForm.get("select-pv-modules");
              params.offset_pv = +dataForm.get("offset-pv");
              params.distance_to_barrier = +dataForm.get("distance-to-barrier");
              params.distance_to_pv_area = +dataForm.get("distance-to-pv-area");
              params.height_offset_tables = +dataForm.get("height-offset-tables");
              params.width_offset_tables = +dataForm.get("width-offset-tables");
              params.angle_from_azimut = +dataForm.get("angle-from-azimut");
              params.align_row_tables = dataForm.get("align-tables");
              params.type_table = dataForm.get("type-table");
              params.angle_fix = +dataForm.get("angle-fix");
              params.orientation = dataForm.get("orientation");
            
              if (params.type_table == 'tracker') {
                params.orientation = (params.orientation == 'vertical') ? 'horizontal' : 'vertical'
              };
              
              if (params.orientation == 'vertical') {
                [width_pv, height_pv] = [height_pv, width_pv];
              };
              [count_column_pv, count_row_pv] = [count_row_pv, count_column_pv];
              
              params.column_pv_in_table = count_column_pv;
              params.row_pv_in_table = count_row_pv;
              params.width_table = count_column_pv * width_pv + (params.offset_pv / 100) * (count_column_pv - 1);
              params.height_table = count_row_pv * height_pv + (params.offset_pv / 100) * (count_row_pv - 1);
              
              $.ajax({
                url: 'update_configuration',
                beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
                method: 'post',
                data: {id: $("#select_config option:selected").val(), param: params},
                success: function(data) {
                  window.Turbo.renderStreamMessage(data);
                }
              });
              global_params = params
              
              if (params.height_offset_tables < params.height_table) 
                window.Turbo.renderStreamMessage(turbo_message('info', 'Расстояние меньше высоты стола, измените'));

            }
            else {
              window.Turbo.renderStreamMessage(turbo_message('info', 'Не выбран фотоэлектрический модуль'));
            }
        };

        function calcSquareArea(poly_area) {
            const square = area(poly_area);
            const rounded_area_ga = Math.round((square / 10000) * 100) / 100;
            const rounded_area_m = Math.round(square * 100) / 100;
            return [rounded_area_ga, rounded_area_m]
        };

        function outputAreaData(id_area_initial, poly_for_pv) {
            let squares = {all_area: {meters: null, hectares: null}, pv_area: {meters: null, hectares: null}}
            let [rounded_area_ga, rounded_area_m] = calcSquareArea(draw.get(id_area_initial));
            squares.all_area.meters = rounded_area_m
            squares.all_area.hectares = rounded_area_ga
            const square_text = 'Площадь области: <strong>' + 
            rounded_area_ga + 
            '</strong> га / <strong>' + 
            rounded_area_m + 
            '</strong> м²';
            let text_out = square_text
            if (poly_for_pv) {
              [rounded_area_ga, rounded_area_m] = calcSquareArea(poly_for_pv);
              squares.pv_area.meters = rounded_area_m
              squares.pv_area.hectares = rounded_area_ga
              const square_pv_area = 'Полезная площадь: <strong>' + 
                                      rounded_area_ga + 
                                      '</strong> га / <strong>' + 
                                      rounded_area_m + 
                                      '</strong> м²'; 
              text_out = text_out + '<p> ' + square_pv_area + '</p>'
            }
            calculated_area.innerHTML = text_out // + '<p>Столов: <strong>' + all_tables + ' </strong>шт.</p>'
            return squares
        };
        
        function initBingMaps() {
            const BingMapsKey = 'Ahdsg0_Kxmm_5xKeGvoQzzMeUjhfT-SIAhyQh38t_naexGTgpJLcd3clUu_9VhDL';
            const BingMapsImagerySet = 'AerialWithLabelsOnDemand'; //Alternatively, use 'AerialWithLabelsOnDemand' if you also want labels on the map.
            const BingMapsImageryMetadataUrl = `https://dev.virtualearth.net/REST/V1/Imagery/Metadata/${BingMapsImagerySet}?output=json&uriScheme=https&include=ImageryProviders&key=${BingMapsKey}`;
            fetch(BingMapsImageryMetadataUrl).then(r => r.json()).then(r => {
                var tileInfo = r.resourceSets[0].resources[0];

                //Bing Maps supports subdoamins which can make tile loading faster. Create a tile URL for each subdomain. 
                var tileUrls = [];
                
                tileInfo.imageUrlSubdomains.forEach(sub => {
                    tileUrls.push(tileInfo.imageUrl.replace('{subdomain}', sub));
                  });
                  
                //Use the image provider info to create attributions.
                var attributions = tileInfo.imageryProviders.map(p => {
                    return p.attribution;
                }).join(', ');
            
                //Create a style using a raster layer for the Bing Maps tiles.
                var style = {
                    'version': 8,
                    'sources': {
                        'bing-maps-raster-tiles': {
                            'type': 'raster',
                            'tiles': tileUrls,
                            'tileSize': tileInfo.imageWidth,
                            'attribution': attributions,
                            
                            //Offset set min/max zooms by one as Bign Maps is designed are 256 size tiles, while MapLibre is designed for 512 tiles.
                            'minzoom': 1,
                            'maxzoom': 20
                        }
                    },
                    'layers': [
                        {
                            'id': 'bing-maps-tiles',
                            'type': 'raster',
                            'source': 'bing-maps-raster-tiles',
                            'minzoom': 0,
                            'maxzoom': 23   //Let the imagery be overscaled to support deeper zoom levels.
                        }
                    ]
                };
                
                style_bing_map = style
            });  
        };

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
                if (map.getLayer('image_plan')) {
                    map.removeLayer('image_plan');
                }
                if (map.getSource('image_plan')) {
                    map.removeSource('image_plan');
                }
                if (map.getLayer('grid_points')) {
                    map.removeLayer('grid_points');
                }
                if (map.getSource('grid_points')) {
                    map.removeSource('grid_points');
                }
            });
        };

        function uncombineAreas(e){
            deleteAreas(e.deletedFeatures)
        };

        function combineArea(e){
            deleteAreas(e.deletedFeatures)
            // const id_union_area = e.createdFeatures[0].id
            // const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id_union_area);
            // outputAreaData(id_union_area, poly_for_pv);
            // const all_tables = drawPVs(id_union_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
        }

        function updateArea(e) {
          const id_area = e.features[0].id
          const all_data = draw.getAll();
          
          if (all_data.features.length > 0) {
              // const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id_area);    
              // outputAreaData(id_area, poly_for_pv);
              // const all_tables = drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
          } else {
              calculated_area.innerHTML = '';
              if (e.type !== 'draw.delete') {
                  alert('Use the draw tools to draw a polygon!');
              }
              else {
                  deleteAreas(e.features)
              }
          }
        };

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
                [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(large_area, global_params)
                if (poly_for_pv == 'error') return ['error_square']
                poly_for_pv = createPolyWithHole(poly_for_pv.geometry.coordinates, large_area.geometry.coordinates, all_areas)
                if (poly_for_pv == 'error') return ['error_hole']
              }
              else if (all_areas.length == 1) {
                [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(start_area, global_params)
                if (poly_for_pv == 'error') return ['error_square']
            }
            if (area(poly_for_pv) < 0) alert('Полезная площадь слишком мала')

            setAreaPolyOnMap(id_area, poly_for_pv)

            return [poly_for_pv, top_coord, lower_coord, left_coord, right_coord]
        };

        function drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord) {
            const [lines_for_PV , all_tables] = calcPVs(poly_for_pv, top_coord, lower_coord, left_coord, right_coord, global_params);
            
            setPVPolyOnMap(id_area, lines_for_PV)

            return [all_tables, lines_for_PV]
        };

        function setAreaPolyOnMap(id_area, data) {
          let current_source_poly = map.getSource(`poly_for_pv${id_area}`)
          if (current_source_poly === undefined) {
              map.addSource(`poly_for_pv${id_area}`, { 'type': 'geojson', 'data': data });
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
              current_source_poly.setData(data);
          }
        }

        function handleFiles() {
          const fileList = this.files;
          if (fileList.length == 1) {
            image_plane_URL = window.URL.createObjectURL(fileList[0])
          }
        };

        function set_image_on_map() {
          const selected_obj = draw.getSelected().features
          if (image_plane_URL !== undefined) {
            if (selected_obj.length != 0) {
              const box_poly = selected_obj[0].geometry.coordinates[0].slice(0, 4)
    
              let imageSource = map.getSource('image_plan')
              if (imageSource === undefined) {
                map.addSource('image_plan', {
                  'type': 'image',
                  'url': image_plane_URL,
                  'coordinates': box_poly
                });
                map.addLayer({
                  id: 'image_plan',
                  'type': 'raster',
                  'source': 'image_plan',
                  'paint': {
                    'raster-fade-duration': 0,
                    'raster-opacity': 0.5
                  }
                });
              }
              else {
                  imageSource.updateImage({
                    url: image_plane_URL,
                    coordinates: box_poly
                  });
              }
            } else {
              window.Turbo.renderStreamMessage(turbo_message('info', 'Не выбрана область для загрузки в неё изображения'));
            }
          } else {
            window.Turbo.renderStreamMessage(turbo_message('info', 'Не загружено изображение'));
            document.getElementById("load_image_file").scrollIntoView({behavior: "smooth", block: "center"});
          }
        };

        function setPVPolyOnMap(id_area, data) {
          let current_source_pvs = map.getSource(`pvs${id_area}`);
          if (current_source_pvs === undefined) {
              map.addSource(`pvs${id_area}`, {
                  'type': 'geojson',
                  'data': {
                      'type': 'FeatureCollection',
                      'features': data
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
                  'features': data
              });
          }
        };

        function distance_btn_logic(remove = false) {
          if (btn_distance.hasClass("active_btn") || remove == true) {
            btn_distance.removeClass("active_btn")
            map.getCanvas().style.cursor = ''
            if (map.getLayer('measure-points')) {
              map.removeLayer('measure-points');
            }
            if (map.getLayer('measure-lines')) {
              map.removeLayer('measure-lines');
            }
            if (map.getSource('geojson_dist')) {
                map.removeSource('geojson_dist');
            }
            geojson.features = []
            distanceContainer.innerHTML = '';
            return
          } else {
            btn_distance.addClass("active_btn")
  
            let current_source_poly = map.getSource('geojson_dist')
            if (current_source_poly === undefined) {
                map.addSource('geojson_dist', {
                  'type': 'geojson',
                  'data': geojson
                });
                map.addLayer({
                  id: 'measure-points',
                  type: 'circle',
                  source: 'geojson_dist',
                  paint: {
                      'circle-radius': 5,
                      'circle-color': '#5c64ff'
                  },
                  filter: ['in', '$type', 'Point']
                });
                map.addLayer({
                    id: 'measure-lines',
                    type: 'line',
                    source: 'geojson_dist',
                    layout: {
                        'line-cap': 'round',
                        'line-join': 'round'
                    },
                    paint: {
                        'line-color': '#696969',
                        'line-width': 2.5
                    },
                    filter: ['in', '$type', 'LineString']
                });
            }
            else {
                current_source_poly.setData(geojson);
            }
          }
        };
        
        function measure_distance(e) {
          if (btn_distance.hasClass("active_btn")) {
            var features = map.queryRenderedFeatures(e.point, {
                layers: ['measure-points']
            });
            if (geojson.features.length > 1) geojson.features.pop();
    
            distanceContainer.innerHTML = '';
    
            if (features.length) {
                var id = features[0].properties.id;
                geojson.features = geojson.features.filter(function (point) {
                    return point.properties.id !== id;
                });
            } else {
                var point = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [e.lngLat.lng, e.lngLat.lat]
                    },
                    'properties': {
                        'id': String(new Date().getTime())
                    }
                };
    
                geojson.features.push(point);
            }
            if (geojson.features.length > 1) {
                linestring.geometry.coordinates = geojson.features.map(
                    function (point) {
                        return point.geometry.coordinates;
                    }
                );
    
                geojson.features.push(linestring);
                // Populate the distanceContainer with total distance
                var value = document.createElement('pre');
                var length_meters = length(linestring) * 1000
                value.textContent =
                    'Расстояние: ' + length_meters.toLocaleString() + 'm';
                distanceContainer.appendChild(value);
            }
            map.getSource('geojson_dist').setData(geojson);
          }

        };

        function change_cursor(e) {
          if (btn_distance.hasClass("active_btn")) {
            var features = map.queryRenderedFeatures(e.point, {
                layers: ['measure-points']
            });
            // UI indicator for clicking/hovering a point on the map
            map.getCanvas().style.cursor = features.length
                ? 'pointer'
                : 'crosshair';
          }
        };
        
        function load_kml() {
          const files = document.getElementById("load_kml_file").files
          if (files.length == 1) {
              const kml_URL = window.URL.createObjectURL(files[0])
              fetch(kml_URL)
              .then(function (response) {
                return response.text();
              })
              .then(function (xml) {
                const geo_kml = kml(new DOMParser().parseFromString(xml, "text/xml"))
                kml_in_map(geo_kml)
              });
          } else {
            window.Turbo.renderStreamMessage(turbo_message('info', 'Не загружен KML файл'));
          }
        };

        function kml_in_map(geo_kml) {
          geo_kml.features.forEach((area) => {
            draw.add(area)
          });
          const bbox_all = bbox(geo_kml)
          document.getElementById("logo_text").scrollIntoView({behavior: "smooth", block: "center"});
          map.fitBounds(bbox_all, {
            padding: 80,
            animate: true,
          })
        };

        function create_rect() {
          const params = {
            point: null,
            length: null,
            width: null,
            angle: null
          } 
          const select_pt = draw.getSelected().features
          if (select_pt.length == 1 && select_pt[0].geometry.type == 'Point') {
            if ($('#in_rect_length').val() != '' && $('#in_rect_width').val() != '') {
              params.point = select_pt[0]
              params.length = +$('#in_rect_length').val()
              params.width = +$('#in_rect_width').val()
              params.angle = +$('#in_rect_angle').val()
              const rect_poly = createRectPolygon(params)
              draw.add(rect_poly)
              document.getElementById("logo_text").scrollIntoView({behavior: "smooth", block: "center"});
              map.fitBounds(bbox(rect_poly), {
                padding: 80,
                animate: true,
              })
            } else {
              window.Turbo.renderStreamMessage(turbo_message('info', 'Введите длину и ширину требуемой области'));
            }
          } else {
            window.Turbo.renderStreamMessage(turbo_message('info', 'Выберите точку'));
          }
        };
        
        function get_selected_polygon() {
          const selected_ids = draw.getSelectedIds();
          $('#btn_csv_to_pvsyst').fadeTo(500, 0);
          if (selected_ids.length != 0) {
            try {
              const id = selected_ids[0]
              const map_feature = draw.get(id)
              if (map_feature.geometry.type == "MultiPolygon" || map_feature.geometry.type == "Polygon") {
                const offset_pt = +$('#offset_pt').val()
                if ($('#type_area_project').is(':checked')){
                  let source = map.getSource(`poly_for_pv${id}`)
                  if (source === undefined) {
                    window.Turbo.renderStreamMessage(turbo_message('error', 'Сконфигурируйте полезную площадь'));
                  }
                  else {
                    $('#loader').fadeTo(500, 1)
                    const poly_for_pv = source._data
                    set_grid_points(map_feature, poly_for_pv, offset_pt)
                  }
                } else {
                  $('#loader').fadeTo(500, 1)
                  set_grid_points(map_feature, map_feature, offset_pt)
                };
                $('#loader').fadeTo(500, 0, function() {
                  $('#loader').hide()
                });
              } else {
                window.Turbo.renderStreamMessage(turbo_message('info', 'Приложение работает только с полигонами'));
              };
            } catch (e) {
              console.log(e.stack)
              window.Turbo.renderStreamMessage(turbo_message(
                'error', 
                `Произошла ошибка при отрисовке области под ФЭМ: ${e};`
              ));
              return;
            }
          }
          else {
            window.Turbo.renderStreamMessage(turbo_message('info', 'Не выбрана область'));
          }
        };

        function set_grid_points(box, mask, offset_pt) {
          const grid_box = bbox(box);
          const options = {units: 'meters', mask: mask};

          const grid = pointGrid(grid_box, offset_pt, options);

          let source = map.getSource('grid_points')
          if (source === undefined) {
            map.addSource('grid_points', { 'type': 'geojson', 'data': grid });
            map.addLayer({
              'id': 'grid_points',
              'type': 'circle',
              'source': 'grid_points',
              'paint': {
              'circle-radius': 3,
              'circle-color': '#ff3838eb'
              },
              'filter': ['==', '$type', 'Point']
            });
          }
          else {
            source.setData(grid);
          }
          document.getElementById("logo_text").scrollIntoView({behavior: "smooth", block: "center"});
          map.fitBounds(grid_box, {
            padding: 100,
            animate: true,
          })
        };

        function getRelief() {
            const elevationArea = [];
            const coordinates = []
            let source = map.getSource('grid_points')
            if (source === undefined) {
              window.Turbo.renderStreamMessage(turbo_message('error', 'Расставьте точки'));
            }
            else {
              $('#loader').fadeTo(500, 1, async function() {
                const grid = source._data
                grid.features.forEach((el) => {
                  coordinates.push(el.geometry.coordinates)
                })
                for (const c of coordinates) {
                    const elevation = await elevationProvider.getElevation(c[1], c[0]);
                    elevationArea.push({
                      long: c[1], 
                      lat:  c[0],
                      elevate: elevation
                    })
                }
                if (elevationArea) {
                  const formData = new FormData();
                  formData.append('pvsyst', JSON.stringify(elevationArea));
                  formData.append('distance_pt', +$('#offset_pt').val());
                  $.ajax({
                    method: 'post',
                    url: 'gen_csv_for_pvsyst',
                    data: formData,
                    processData: false,
                    contentType: false,
                    beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
                    success: function(data) {
                      $('#btn_csv_to_pvsyst').fadeTo(500, 1);
                      window.Turbo.renderStreamMessage(turbo_message('notice', 'Высотные отметки успешно получены'));
                      $('#loader').fadeTo(500, 0, function() {
                        $('#loader').hide()
                      });
                    },
                    error: function (request, status, error) {
                      window.Turbo.renderStreamMessage(turbo_message('error', `Что-то пошло не так :( ${error}`));
                      $('#loader').fadeTo(500, 0, function() {
                        $('#loader').hide()
                      });
                    }
                  });
                }
              });
            };
        };
    };
})


