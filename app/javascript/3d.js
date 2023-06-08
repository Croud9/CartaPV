let chartData = []
drawChart()

const map = new maplibregl.Map({
  container: "map",
  zoom: 15,
  center: [55, 51],
  pitch: 45,
  maxPitch: 70,
  minZoom: 9,
  style: {
    version: 8,
    name: "OSM Mecklenburg GeoPortal",
    maxPitch: 70,
    zoom: 13.5,
    center: [-80.846, 35.223],
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap Contributors",
        maxzoom: 19
      },
      hillshade_source: {
      type: "raster-dem",
        encoding: "terrarium",
        tiles: [
          "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 14
    },
      terrain_source: {
        type: "raster-dem",
        encoding: "terrarium",
        tiles: [
          "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 14
      }
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm"
      },
      {
        id: "hills",
        type: "hillshade",
        source: "hillshade_source"
      }
    ],
    terrain: {
      source: 'terrain_source',
      exaggeration: 5
    }
  }
});

map.on("load", function () {

  map.on("click", function (e) {
    var features = map.queryRenderedFeatures(e.point, {
      layers: ["measure-points"]
    });

    // Remove the linestring from the group
    // So we can redraw it based on the points collection
     if (geojson.features.length > 1) geojson.features.pop();

    // If a feature was clicked, remove it from the map
    if (features.length) {
      var id = features[0].properties.id;
      geojson.features = geojson.features.filter(function (point) {
        return point.properties.id !== id;
      });
    } else {
      var point = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [e.lngLat.lng, e.lngLat.lat]
        },
        properties: {
          id: String(new Date().getTime())
        }
      };
      geojson.features.push(point);
    }

    if (geojson.features.length > 1) {
      linestring.geometry.coordinates = geojson.features.map(function (point) {
        return point.geometry.coordinates;
      });

      geojson.features.push(linestring);
      
      // get length of line
      let lineLength = turf.length(linestring, {units: 'meters'})
      
      // however many subdivisions we want
      let divisionLength = lineLength / 20
      
      let newLine = turf.lineChunk(linestring, divisionLength, {units: 'meters'})
      chartData = newLine.features.map(el => map.queryTerrainElevation(el.geometry.coordinates[0]))
    }

    map.getSource("geojson").setData(geojson);
  });
});
