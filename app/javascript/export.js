import maplibregl from 'maplibre-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import area from '@turf/area';
import bbox from '@turf/bbox';
import centroid from '@turf/centroid';
import { polygon, featureCollection } from '@turf/helpers';
import { turbo_message } from "./flash_message.js";
import { calcAreaForPV, calcPVs, createPolyWithHole } from "./pv-calc.js";

document.addEventListener("turbo:load", function() {
    if (document.getElementById("map_not_display") !== null) {
      let style_bing_map, map_not_display
      const style_topo = 'https://api.maptiler.com/maps/975e75f4-3585-4226-8c52-3c84815d6f2a/style.json?key=QA99yf3HkkZG97cZrjXd'
      initBingMaps()
      accessToFormElements(false)
      $('#select_config_pdf').empty();
      $('#form_pdf').fadeTo(500, 1);
      $('#select_project_pdf').change(function() {
        $('#multiselect_field').empty();
        $('#select_config_pdf').empty();
        $.ajax({
          url: "get_configs_by_project",
          data: "id=" + $("#select_project_pdf option:selected").val(),
          success: null,
          dataType: "script",
        });
        accessToFormElements(true)
        $("#btn_open_pdf").prop('disabled', true);
      });

      $("#btn_pdf").click(function(e) {
        let isFormValid = $('#form_pdf')[0].checkValidity();
        if(!isFormValid) {
          $('#form_pdf')[0].reportValidity();
        } else {
          e.preventDefault();
          get_config_params()
        }
      });

      $("#style_not_map_satellite").click(function () {
        map_not_display.setStyle('https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd')
      })
      $("#style_not_map_topo").click(function () {
        map_not_display.setStyle(style_topo)
      })

      map_not_display = new maplibregl.Map({
        container: 'map_not_display',
        zoom: 3,
        center: [100, 65],
        style:
        'https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd', 
        preserveDrawingBuffer: true,
        trackResize: false,
        interactive: false,
        fadeDuration: 0,
        attributionControl: false
      });

      $('#map_not_display').css("display", "none")

      map_not_display.on('load', function () {
        map_not_display.loadImage(
          'sun.png',
          function (error, image) {
            if (error) throw error;
            map_not_display.addImage('sun', image);
          }
        );
      });

      function get_config_params() {
        const selected_config = $("#select_config_pdf").val()
        $.ajax({
          url: "get_params_for_snapshots",
          data: {id: selected_config},
          success: function(data) {
            if (typeof(data) == 'string'){
              console.log(data)
              window.Turbo.renderStreamMessage(data);
            }
            else {
              console.log(data)
              accessToFormElements(false)
              // init_map(data)
              drawPointInCountry(data)
            }
          },
        });
      };

      function drawPointInCountry(data) {
        const center_pt = centroid(data.project_areas)
        
        let current_source_poly = map_not_display.getSource('pt_geolocation')
        if (current_source_poly === undefined) {
          map_not_display.addSource('pt_geolocation', { 'type': 'geojson', 'data': center_pt });
          map_not_display.addLayer({
                'id': 'pt_geolocation',
                'type': 'symbol',
                'source': 'pt_geolocation',
                'layout': {},
                'layout': {
                  'icon-image': 'sun',
                  'icon-size': 0.16
                }
          });
        }
        else {
            current_source_poly.setData(center_pt);
        }

        map_not_display.flyTo({
          center: center_pt.geometry.coordinates,
          zoom: 2,
          animate: false,
        });
        
        map_not_display.once('idle', function(){
          map_not_display.getCanvas().toBlob(function (blob) {
            data['project_img'] = blob

            if (map_not_display.getLayer('pt_geolocation')) {
              map_not_display.removeLayer('pt_geolocation');
            }
            if (map_not_display.getSource('pt_geolocation')) {
              map_not_display.removeSource('pt_geolocation');
            }

            reverseGeocode(center_pt.geometry.coordinates).then(function(result) {
              data['location'] = {
                latlong: [result.address.lat, result.address.lon],
                address: result.address.display_name
              }
              drawPolyPV(data)
            });
          })
        })
      };

      function drawPolyPV(data) {
        const bbox_all = bbox(data.project_areas)
        map_not_display.fitBounds(bbox_all, {
          padding: 20,
          animate: false,
        })
        if ($('#style_not_map_satellite').is(':checked')) map_not_display.setStyle(style_bing_map)

        const current_source_poly = map_not_display.getSource('project_area')
        if (current_source_poly === undefined) {
          map_not_display.addSource('project_area', { 'type': 'geojson', 'data': data.project_areas });
          map_not_display.addLayer({
            'id': 'project_area',
            'type': 'line',
            'source': 'project_area',
            'paint': {
              'line-color': 'rgb(128, 172, 255)',
              'line-width': 3
            }
          });
        }
        else {
            current_source_poly.setData(data.project_areas );
        }
        snapshot_PV(data, 0)
      };

      function snapshot_PV(data, i) {
        let all_squares = {
          all_area: {meters: 0, hectares: 0}, 
          pv_area: {meters: 0, hectares: 0}
        };
        let all_tables = 0
        const config = data.configs[i]
        params_to_num(config.configuration)  
        drawTable(config)

        try {
          data.project_areas.features.forEach((item) => {
            const id_area = item.id
            const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id_area, item, config.configuration, map_not_display);  
            const [tables, data_pv] = drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord, config.configuration, map_not_display);
            const squares = outputAreaData(item, poly_for_pv);
            all_squares.all_area.meters += squares.all_area.meters
            all_squares.all_area.hectares += squares.all_area.hectares
            all_squares.pv_area.meters += squares.pv_area.meters
            all_squares.pv_area.hectares += squares.pv_area.hectares
            all_tables += tables
          })
        } catch (e) {
          window.Turbo.renderStreamMessage(turbo_message(
            'error', 
            `Произошла ошибка при отрисовке конфигурации: ${config.title};
            Ошибка ${e}; 
            Временное решение: Изменить угол относительно азимута / 
            Изменить нижнюю (при 90°) или левую границу (при 0°/180°) области, сгладить угловатые выступы / 
            Изменить конфигурацию стола`
          ));
          accessToFormElements(true)
          if ($('#style_not_map_satellite').is(':checked')){
            map_not_display.setStyle('https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd')
          }
          return;
        }

        const total_params = {
          squares: all_squares, 
          all_tables: all_tables
        }

        map_not_display.once('idle', function(){
          map_not_display.getCanvas().toBlob(function (blob) {
            config['config_img'] = blob
            config['total_params'] = total_params
          
            deleteAreas(data.project_areas.features, map_not_display)
            if (i != data.configs.length - 1 ) {
              i++
              snapshot_PV(data, i)
            } else {
              saveRequestParams(data)
              if ($('#style_not_map_satellite').is(':checked')){
                map_not_display.setStyle('https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd')
              }
            }
          })
        })
      };

      function saveRequestParams(data) {
        const formData = new FormData();
        // formData.append('id', $("#select_config option:selected").val());
        // formData.append('data', JSON.stringify(data));
        formData.append('project_img', data.project_img);
        formData.append('location', JSON.stringify(data.location));
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
          success: function() { 
            window.Turbo.renderStreamMessage(turbo_message('notice', 'Отчет сгенерирован!'));
            if ($('#dwnld_planes').is(':checked')) {
              createPrintMap(data)
            } else {
              $("#btn_open_pdf").prop('disabled', false);
              accessToFormElements(true)
            }
          }
        });
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
      };
      
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

      function deleteAreas(features, map) {
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

      function drawAreaForPV(id_area, main_area, config, map) {
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

        setAreaPolyOnMap(id_area, poly_for_pv, map)

        return [poly_for_pv, top_coord, lower_coord, left_coord, right_coord]
      }

      function drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord, config, map) {
          const [lines_for_PV , all_tables] = calcPVs(poly_for_pv, top_coord, lower_coord, left_coord, right_coord, config);
          
          setPVPolyOnMap(id_area, lines_for_PV, map)

          return [all_tables, lines_for_PV]
      }

      function setAreaPolyOnMap(id_area, data, map) {
        let opacity_pv_area = $('#style_not_map_satellite').is(':checked') ? 0.9 : 0.4;
        let current_source_poly = map.getSource(`poly_for_pv${id_area}`)
        if (current_source_poly === undefined) {
          map.addSource(`poly_for_pv${id_area}`, { 'type': 'geojson', 'data': data });
          map.addLayer({
                'id': `poly_for_pv${id_area}`,
                'type': 'fill',
                'source': `poly_for_pv${id_area}`,
                'layout': {},
                'paint': {
                    'fill-color': '#80ffb5',
                    'fill-opacity': opacity_pv_area
                }
            });
        }
        else {
            current_source_poly.setData(data);
        }
      }

      function setPVPolyOnMap(id_area, data, map) {
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
                    'line-color': '#fff', 
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
                    'line-width': 0.1
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
                    'fill-color': '#0000f0',
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

      function drawTable(config) {
          let x_start = 0;
          let y_start = 0;
          let row_tables = config.configuration.column_pv_in_table;
          let col_tables = config.configuration.row_pv_in_table;
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
          let orientation
          if (config.configuration.type_table == 'fix') {
              [col_tables, row_tables] = [row_tables, col_tables]
              orientation = config.configuration.orientation
          } else {
              if (config.configuration.orientation == 'horizontal') {
                orientation = 'vertical'
              } else {
                orientation = 'horizontal'
              }
          }

          if (orientation == 'horizontal') {
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
              fillOpacity: 1,
              fill: '#fff',
              stroke: "#fff",
              strokeWidth: 0.1,

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
              stroke: "#fff",
              strokeWidth: 0.1,
          });
          params.table.add(base_pv)

          for (let col = 0; col < params.col_cells; col++) {
              for (let row = 0; row < params.row_cells; row++) {
                  const cell_pv = svg.rect(x_start + (params.w_cell + 0.5) * col, y_start + (params.h_cell + 0.5) * row, params.w_cell, params.h_cell);
                  cell_pv.attr({
                      fill: '#005da8',
                      stroke: "#cfcfcf",
                      strokeWidth: 0.05,
                      rx: 1.5,
                      ry: 1.5,
                  });
                  params.table.add(cell_pv)
              };
          };
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
      
      function accessToFormElements(access) {
        if (access == true) {
          $("#btn_pdf").prop('disabled', false);
          $("#btn_pdf").text('Сгенерировать');
          $("#multiselect_field").prop('disabled', false);
          $("#checkbox_config_pdf").prop('disabled', false);
          $("#select_config_pdf").prop('disabled', false);
          $("#style_not_map_satellite").prop('disabled', false);
          $("#style_not_map_topo").prop('disabled', false);
          $("#dwnld_planes").prop('disabled', false);
        } else {
          $("#btn_open_pdf").prop('disabled', true);
          $("#btn_pdf").prop('disabled', true);
          $("#btn_pdf").text('Подождите...');
          $("#multiselect_field").prop('disabled', true);
          $("#checkbox_config_pdf").prop('disabled', true);
          $("#select_config_pdf").prop('disabled', true);
          $("#style_not_map_satellite").prop('disabled', true);
          $("#style_not_map_topo").prop('disabled', true);
          $("#dwnld_planes").prop('disabled', true);
        }
      };
      
      function downloadImage(imageBlog, title) {
        const imageURL = URL.createObjectURL(imageBlog)
      
        const link = document.createElement('a')
        link.href = imageURL
        link.download = `План конфигурации ${title}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      };

      async function createPrintMap(data) {
        let style
    
        var hidden = document.createElement('div');
        hidden.className = 'hidden-map';
        document.body.appendChild(hidden);
        var container = document.createElement('div');
        container.style.width = `${1000}px`;
        container.style.height = `${600}px`;
        hidden.appendChild(container);
        if ($('#style_not_map_satellite').is(':checked')) {
          style = style_bing_map
        } else {
          style = style_topo
        }

        var actualPixelRatio = window.devicePixelRatio;
        Object.defineProperty(window, 'devicePixelRatio', {
            get: function() {return 576 / 96}
        });

        var renderMap = new maplibregl.Map({
            container: container,
            zoom: 3,
            center: [100, 65],
            style: style,
            preserveDrawingBuffer: true,
            trackResize: false,
            interactive: false,
            fadeDuration: 0,
            attributionControl: false
        });
        container.style.display = 'none';

        renderMap.once('load', function() {
            const bbox_all = bbox(data.project_areas)
            renderMap.fitBounds(bbox_all, {
              padding: 20,
              animate: false,
            })
    
            const current_source_poly = renderMap.getSource('project_area')
            if (current_source_poly === undefined) {
              renderMap.addSource('project_area', { 'type': 'geojson', 'data': data.project_areas });
              renderMap.addLayer({
                'id': 'project_area',
                'type': 'line',
                'source': 'project_area',
                'paint': {
                  'line-color': 'rgb(128, 172, 255)',
                  'line-width': 3
                }
              });
            }
            else {
                current_source_poly.setData(data.project_areas );
            }
            best_quality_snapshot_PV(renderMap, actualPixelRatio, hidden, data, 0)
        });
      }

      function best_quality_snapshot_PV(renderMap, actualPixelRatio, hidden, data, i) {
        const config = data.configs[i]
        params_to_num(config.configuration)  

        try {
          data.project_areas.features.forEach((item) => {
            const id_area = item.id
            const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id_area, item, config.configuration, renderMap);  
            const [tables, data_pv] = drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord, config.configuration, renderMap);
          })
        } catch (e) {
          window.Turbo.renderStreamMessage(turbo_message(
            'error', 
            `Произошла ошибка при отрисовке конфигурации для фото: ${config.title};
            Ошибка ${e}; 
            Временное решение: Изменить угол относительно азимута / 
            Изменить нижнюю (при 90°) или левую границу (при 0°/180°) области, сгладить угловатые выступы / 
            Изменить конфигурацию стола`
          ));
          accessToFormElements(true)
          return;
        }

        renderMap.once('idle', function(){
          renderMap.getCanvas().toBlob(function (blob) {
            downloadImage(blob, config.title)

            deleteAreas(data.project_areas.features, renderMap)
            if (i != data.configs.length - 1 ) {
              i++
              best_quality_snapshot_PV(renderMap, actualPixelRatio, hidden, data, i)
            } else {
              renderMap.remove();
              hidden.parentNode.removeChild(hidden);
              Object.defineProperty(window, 'devicePixelRatio', {
                  get: function() {return actualPixelRatio}
              });
              $("#btn_open_pdf").prop('disabled', false);
              accessToFormElements(true)
              window.Turbo.renderStreamMessage(turbo_message('notice', 'Планы загружены!'));
            }
          })
        })
      };
  };
})


