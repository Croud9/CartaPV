import { MapboxStyleDefinition, MapboxStyleSwitcherControl } from "mapbox-gl-style-switcher";

const styles: MapboxStyleDefinition[] = [
    {
        title: "Outdoor",
        uri:'https://api.maptiler.com/maps/outdoor-v2/style.json?key=QA99yf3HkkZG97cZrjXd'
    },
    {
        title: "Satellite",
        uri:'https://api.maptiler.com/maps/hybrid/style.json?key=QA99yf3HkkZG97cZrjXd'
    },
    {
        title: "Topo",
        uri:'https://api.maptiler.com/maps/975e75f4-3585-4226-8c52-3c84815d6f2a/style.json?key=QA99yf3HkkZG97cZrjXd'
    }
];
var style = new MapboxStyleSwitcherControl(styles, 'Outdoor')
export { style }