import maplibregl from 'maplibre-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import area from '@turf/area';
import bbox from '@turf/bbox';
import centroid from '@turf/centroid';
import { polygon, featureCollection } from '@turf/helpers';
import { calcAreaForPV, calcPVs, createPolyWithHole } from "./pv-calc.js";

document.addEventListener("turbo:load", function() {
    if (document.getElementById("map") !== null) {
        var draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                combine_features: true,
                uncombine_features: true,
                trash: true,
            }
        });
        let style_bing_map
        let global_params
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
        var map;
        var BingMapsKey = 'Ahdsg0_Kxmm_5xKeGvoQzzMeUjhfT-SIAhyQh38t_naexGTgpJLcd3clUu_9VhDL';
        var BingMapsImagerySet = 'AerialWithLabelsOnDemand'; //Alternatively, use 'AerialWithLabelsOnDemand' if you also want labels on the map.
        var BingMapsImageryMetadataUrl = `https://dev.virtualearth.net/REST/V1/Imagery/Metadata/${BingMapsImagerySet}?output=json&include=ImageryProviders&key=${BingMapsKey}`;

        initBingMaps()
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
        $('#select_config').change(get_config_params);
        $('#select_project').change(set_project_area);
        $('#btn_save_area').click(add_main_area_to_db);
        $("#type-table2").click(function () {
          console.log('ratatatat')
          $('#angle-from-azimut').val(global_params.angle_from_azimut);
          $('#rangevalue2').text(global_params.angle_from_azimut);
        })
        $("#style_map_satellite").click(function () {
          map.setStyle('https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd')
        })
        $("#style_map_streets").click(function () {
          map.setStyle(style_bing_map)
        })
        $("#style_map_outdoors").click(function () {
          map.setStyle('https://api.maptiler.com/maps/975e75f4-3585-4226-8c52-3c84815d6f2a/style.json?key=QA99yf3HkkZG97cZrjXd')
        })
        $('#downloadLink').click(function () {
          // snapshotCountry()
          // map_not_display.setZoom(10)

          // Порядок работы
          // Добавляем точку на карте страны соответсвующую центру области и зафиксировать координаты
          // зуум на 2
          // фотография страны с точкой
          // удаление точки
          // fitBounds к области
          // простройка ФЭМ каждой выбранной конфигурации фотографируя результат соответсвенно
          

          // draw.changeMode('simple_select')
          // map.getCanvas().toBlob(function (blob) {
            //   // saveAs(blob, 'map.png');
            //   // var objectURL = URL.createObjectURL(blob);
            //   // console.log(objectURL)
            //   // document.querySelector("#image").src = objectURL;
            // })
        })
        // при сохранении еще добавить  get_config_params(
        
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
                  // map.flyTo({
                  //   center: centroid(data).geometry.coordinates,
                  //   zoom: 3,
                  //   essential: true // this animation is considered essential with respect to prefers-reduced-motion
                  // });
                  const bbox_all = bbox(data)
                  map.fitBounds(bbox_all, {
                      padding: 80,
                      animate: true,
                  })
                }
              },
            });
          };
        }

        function add_main_area_to_db() {
          let areas = []
          const selected_ids = draw.getSelectedIds();
          if (selected_ids.length != 0) {
            selected_ids.forEach((id) => {
              areas.push(draw.get(id))
            });

            $.ajax({
              method: 'post',
              url: 'update_draw_area',
              data: {id: $("#select_project option:selected").val(), options: JSON.stringify(featureCollection(areas))},
              beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
              success: function(data) { alert('Успешно сохранено'); }
            });
          };
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
            let all_data = []
            const selected_ids = draw.getSelectedIds();
            console.log('selected ids --> ' + selected_ids)
            if (selected_ids.length != 0) {
              selected_ids.forEach((id) => {
                const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id);
                let feature = {idx: id, poly_features: poly_for_pv, pv_features: null}
                all_data.push(feature)
                // const all_tables = drawPVs(item, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
                // outputAreaData(item, poly_for_pv, all_tables); 
              });
              console.log(all_data)
              $.ajax({
                method: 'post',
                url: 'update_configuration',
                data: {id: $("#select_config option:selected").val(), param: null, geojsons: JSON.stringify(all_data)},
                beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
                success: function(data) { window.Turbo.renderStreamMessage(data);}
              });
            }
            else {
              alert('Не выбрана область');
            }
        };

        function clickDrawPV(event) {
          let all_data = []
          let total_params = {}
          let bound
          const selected_ids = draw.getSelectedIds();
          draw.changeMode('simple_select')
          if (selected_ids.length != 0) {
            if ($('#select-pv-modules option:selected').text() != "Выберите") {
              selected_ids.forEach((id) => {
                  bound = draw.get(id)
                  const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id);  
                  const [all_tables, data_pv] = drawPVs(id, poly_for_pv, top_coord, lower_coord, left_coord, right_coord);
                  let feature = {idx: id, poly_features: poly_for_pv, pv_features: null}
                  // let feature = {idx: id, poly_features: poly_for_pv, pv_features: data_pv} // очень долго
                  all_data.push(feature)
                  const squares = outputAreaData(id, poly_for_pv, all_tables);
                  total_params = {squares: squares, all_tables: all_tables}
              });
              const bbox_all = bbox(draw.getAll())
              map.fitBounds(bbox_all, {padding: 80})
        
              const formData = new FormData();
              formData.append('id', $("#select_config option:selected").val());
              formData.append('geojsons', JSON.stringify(all_data));
              formData.append('total_params', JSON.stringify(total_params));

              $.ajax({
                method: 'post',
                url: 'update_configuration',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
                success: function(data) { window.Turbo.renderStreamMessage(data);}
              });
            }
            else {
              alert('Не выбран фотоэлектрический модуль! Выберите и сохраните конфигурацию');
            }
          }
          else {
            alert('Не выбрана область');
          }
        };

        function serializeForm(formNode) {
            return new FormData(formNode)
        }

        function get_config_params() {
          if ($('#select_config option:selected').text() != "Выберите") {
            $.ajax({
              url: "get_config_params",
              data: "id=" + $("#select_config option:selected").val(),
              success: function(data) {
                if (data.geojson !== null) {
                  data.geojson.forEach((json) => {
                    console.log(json.idx)
                    setAreaPolyOnMap(json.idx, json.poly_features)
                    // if (json.pv_featuren !== null) setPVPolyOnMap(json.idx, json.pv_features) 
                  });
                }
                else {
                  deleteAreas(draw.getAll().features)
                };
                global_params = data.configuration
                params_to_num()
              },
              dataType: "json",
            });
          };
        }

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
        }

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
                data: {id: $("#select_config option:selected").val(), param: params, geojsons: null},
                success: function(data) {
                  window.Turbo.renderStreamMessage(data);
                }
              });
              global_params = params
              
              if (params.height_offset_tables < params.height_table) 
                alert('Расстояние меньше высоты стола, измените');

            }
            else {
              alert('Не выбран фотоэлектрический модуль');
            }
        }

        function calcSquareArea(poly_area) {
            const square = area(poly_area);
            const rounded_area_ga = Math.round((square / 10000) * 100) / 100;
            const rounded_area_m = Math.round(square * 100) / 100;
            return [rounded_area_ga, rounded_area_m]
        }

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
            
            [rounded_area_ga, rounded_area_m] = calcSquareArea(poly_for_pv);
            squares.pv_area.meters = rounded_area_m
            squares.pv_area.hectares = rounded_area_ga
            const square_pv_area = 'Полезная площадь: <strong>' + 
                                    rounded_area_ga + 
                                    '</strong> га / <strong>' + 
                                    rounded_area_m + 
                                    '</strong> м²';           
            answer.innerHTML = square_text + '<p> ' + square_pv_area + '</p>' // + '<p>Столов: <strong>' + all_tables + ' </strong>шт.</p>'
            return squares
        }
        
        function initBingMaps() {
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
                
                //If you want to add terrian, you can either append it onto the stlye like this, or add it inline above.
                
                //Add the source
                // style.sources.terrainSource = {
                //     type: 'raster-dem',
                //     url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
                //     tileSize: 256
                // };
                
                // style.terrain = {
                //     source: 'terrainSource',
                //     exaggeration: 1
                // };
                
                //Load MapLibre with this style.
                // loadMap(style);
                style_bing_map = style
            });
            
        }

        var map = new maplibregl.Map({
                container: 'map',
                zoom: 2,
                center: [100, 65],
                style:
                'https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd', // Актуальные, бесшовные изображения для всего мира с учетом контекста
                // 'mapbox://styles/mapbox/satellite-streets-v5', // Актуальные, бесшовные изображения для всего мира с учетом контекста
                // 'https://api.maptiler.com/maps/3f98f986-5df3-44da-b349-6569ed7b764c/style.json?key=QA99yf3HkkZG97cZrjXd' //Идеальная карта для активного отдыха
                // 'https://api.maptiler.com/maps/975e75f4-3585-4226-8c52-3c84815d6f2a/style.json?key=QA99yf3HkkZG97cZrjXd', // Идеальная базовая карта местности с контурами и заштрихованным рельефом.
                // preserveDrawingBuffer: true,
                antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
        }); 

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

        map.on('load', function () {
          $('#map_styles').fadeTo(500, 1);
        });
          


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
              answer.innerHTML = '';
              if (e.type !== 'draw.delete') {
                  alert('Use the draw tools to draw a polygon!');
              }
              else {
                  deleteAreas(e.features)
              }
          }
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
                [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(large_area, global_params)
                poly_for_pv = createPolyWithHole(poly_for_pv.geometry.coordinates, large_area.geometry.coordinates, all_areas)
            }
            else if (all_areas.length == 1) {
                [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = calcAreaForPV(start_area, global_params)
            }
            if (area(poly_for_pv) < 0) alert('Полезная площадь слишком мала')

            setAreaPolyOnMap(id_area, poly_for_pv)

            return [poly_for_pv, top_coord, lower_coord, left_coord, right_coord]
        }

        function drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord) {
            const [lines_for_PV , all_tables] = calcPVs(poly_for_pv, top_coord, lower_coord, left_coord, right_coord, global_params);
            
            setPVPolyOnMap(id_area, lines_for_PV)

            return [all_tables, lines_for_PV]
        }

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
        }
    };
})



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


