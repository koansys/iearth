/* global OpenLayers */

var map = new OpenLayers.Map({
    div: 'map',
    projection: 'EPSG:4326',
    numZoomLevels: 9,
    zoom: 2
});

var TILEMATRIXSET_GEO_250m = 'EPSG4326_250m';
// var TILEMATRIXSET_GEO_500m = 'EPSG4326_500m';
// var TILEMATRIXSET_GEO_1km = 'EPSG4326_1km';
var TILEMATRIXSET_GEO_2km = 'EPSG4326_2km';

var GIBS_WMTS_GEO_ENDPOINT = 'http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi';

// Create base layers
var layerModisTerraTrueColor = new OpenLayers.Layer.WMTS({
    name: 'Terra / MODIS Corrected Reflectance (True Color), 2012-06-08',
    url: GIBS_WMTS_GEO_ENDPOINT,
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    matrixSet: TILEMATRIXSET_GEO_250m,
    format: 'image/jpeg',
    style: '',
    transitionEffect: 'resize',
    projection: 'EPSG:4326',
    numZoomLevels: 9,
    maxResolution: 0.5625,
    'tileSize': new OpenLayers.Size(512, 512),
    isBaseLayer: true
});

// Create overlays
var layerModisAerosolOpticalDepth = new OpenLayers.Layer.WMTS({
    name: 'Terra / MODIS Aerosol Optical Depth, 2012-06-08',
    url: GIBS_WMTS_GEO_ENDPOINT,
    layer: 'MODIS_Terra_Aerosol',
    matrixSet: TILEMATRIXSET_GEO_2km,
    format: 'image/png',
    style: '',
    transitionEffect: 'resize',
    projection: 'EPSG:4326',
    numZoomLevels: 9,
    maxResolution: 0.5625,
    'tileSize': new OpenLayers.Size(512, 512),
    isBaseLayer: false,
    visibility: false
});

// The 'time' parameter isn't being included in tile requests to the server
// in the current version of OpenLayers (2.12); need to use this hack
// to force the inclusion of the time parameter.
//
// If the time parameter is omitted, the current (UTC) day is retrieved
// from the server
layerModisTerraTrueColor.mergeNewParams({time:'2012-06-08'});
//layerModisTerra721.mergeNewParams({time:'2012-06-08'});
layerModisAerosolOpticalDepth.mergeNewParams({time:'2012-06-08'});
//layerAirsDustScore.mergeNewParams({time:'2012-06-08'});

//Finally, add the layers to the map, add a layer switcher, and set the view extent:

// Add layers to the map
map.addLayers([layerModisTerraTrueColor,
               //layerModisTerra721,
               layerModisAerosolOpticalDepth,
               //layerAirsDustScore
              ]);

// Add layer switcher control
map.addControl(new OpenLayers.Control.LayerSwitcher());

// Set global view
var extent = '-146.0, -94.0, 146.0, 94.0';
var OLExtent = new OpenLayers.Bounds.fromString(extent, false).transform(
    new OpenLayers.Projection('EPSG:4326'),
    map.getProjectionObject());
map.zoomToExtent(OLExtent, true);
