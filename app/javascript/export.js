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
        
        const id_area = data.project_areas.features[0].id
        // data.configs.forEach((config) => {
        //   params_to_num(config.configuration)
        //   console.log(config)
        //   const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id_area, data.project_areas.features[0], config.configuration);  
        //   const [all_tables, data_pv] = drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord, config.configuration);
        //   map_not_display.once('idle',function(){
        //     deleteAreas(data.project_areas.features)
        //   })
        //   // setTimeout(() => {  deleteAreas(data.project_areas.features)}, 2000);
        // });

        let conf = 0
        while ( conf < data.configs.length - 1){
            console.log('arwe - >' + conf)  
            const config = data.configs[conf]
            params_to_num(config.configuration)
            console.log(config)  
            const [poly_for_pv, top_coord, lower_coord, left_coord, right_coord] = drawAreaForPV(id_area, data.project_areas.features[0], config.configuration);  
            const [all_tables, data_pv] = drawPVs(id_area, poly_for_pv, top_coord, lower_coord, left_coord, right_coord, config.configuration);
            map_not_display.once('idle',function(){
              map_not_display.getCanvas().toBlob(function (blob) {
                const pt_pvs = blob
                conf++
                console.log('atttttttribute')  
              })
              deleteAreas(data.project_areas.features)
            })

          }
          // setTimeout(() => {  deleteAreas(data.project_areas.features)}, 2000);

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
          // deleteAreas(data.project_areas.features)
          map_not_display.getCanvas().toBlob(function (blob) {
            const pt_country_img = blob
            if (map_not_display.getLayer('pt_geolocation')) {
              map_not_display.removeLayer('pt_geolocation');
            }
            if (map_not_display.getSource('pt_geolocation')) {
              map_not_display.removeSource('pt_geolocation');
            }
            drawPolyPV(data)
            // const formData = new FormData();
            // formData.append('id', $("#select_config option:selected").val());
            // formData.append('geojsons', JSON.stringify(all_data));
            // formData.append('total_params', JSON.stringify(total_params));
            // formData.append('files', blob);
  
            // $.ajax({
            //   method: 'post',
            //   url: 'update_files',
            //   data: formData,
            //   processData: false,
            //   contentType: false,
            //   beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
            //   success: function(data) { alert('Успешно сохранено');}
            // });
          })
        })


      }

      function getParams() { 
        get_config_params()
      }

      $("#btn_pdf").click(function(e) {
        let isFormValid = $('#form_pdf')[0].checkValidity();
        if(!isFormValid) {
          $('#form_pdf')[0].reportValidity();
        } else {
          e.preventDefault();
          getParams()
          // $("#form_pdf").submit();
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
    }
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
    };
})
