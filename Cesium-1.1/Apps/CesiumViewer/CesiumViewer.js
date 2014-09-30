/*global define*/
define([
        'Core/Credit',
        'Core/defined',
        'Core/formatError',
        'Core/getFilenameFromUri',
        'Core/GeographicTilingScheme',
        'DataSources/CzmlDataSource',
        'DataSources/GeoJsonDataSource',
        'Scene/WebMapServiceImageryProvider',
        'Scene/WebMapTileServiceImageryProvider',
        'Widgets/Viewer/Viewer',
        'Widgets/Viewer/viewerCesiumInspectorMixin',
        'Widgets/Viewer/viewerDragDropMixin',
        'Widgets/Viewer/viewerEntityMixin',
        'domReady!'
    ], function(
        Credit,
        defined,
        formatError,
        getFilenameFromUri,
        GeographicTilingScheme,
        CzmlDataSource,
        GeoJsonDataSource,
        WebMapServiceImageryProvider,
        WebMapTileServiceImageryProvider,
        Viewer,
        viewerCesiumInspectorMixin,
        viewerDragDropMixin,
        viewerEntityMixin) {
    "use strict";
    /*global console, document, window*/

    /*
     * 'debug'  : true/false,   // Full WebGL error reporting at substantial performance cost.
     * 'lookAt' : CZML id,      // The CZML ID of the object to track at startup.
     * 'source' : 'file.czml',  // The relative URL of the CZML file to load at startup.
     * 'stats'  : true,         // Enable the FPS performance display.
     * 'theme'  : 'lighter',    // Use the dark-text-on-light-background theme.
     * 'scene3DOnly' : false    // Enable 3D only mode
     */
    var endUserOptions = {};
    var queryString = window.location.search.substring(1);
    if (queryString !== '') {
        var params = queryString.split('&');
        for (var i = 0, len = params.length; i < len; ++i) {
            var param = params[i];
            var keyValuePair = param.split('=');
            if (keyValuePair.length > 1) {
                endUserOptions[keyValuePair[0]] = decodeURIComponent(keyValuePair[1].replace(/\+/g, ' '));
            }
        }
    }

    var loadingIndicator = document.getElementById('loadingIndicator');

    var imageryProvider;
    // if (endUserOptions.tmsImageryUrl) {
    //     imageryProvider = new TileMapServiceImageryProvider({
    //         url : endUserOptions.tmsImageryUrl
    //     });
    // }

    // 2014-09-16
    // NASA
    // - NASA offers WMTS and Tile WMS; try the former for now;
    // - WMTS in KVP or REST (Cesium-1.1 only supports KVP, with certain orders!)
    // - KVP: http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?...
    // - NASA appears to have some hacked params that Cesium can't support, like 'time'.
    // - CAUTION: NASA parameters must currently be ordered in a specific way as noted here.
    // - OpenLayers example:
    // -- https://earthdata.nasa.gov/about-eosdis/system-description/global-imagery-browse-services-gibs/gibs-supported-clients#web_based_clients
    // - Important Notes
    // -- Non-polar tiled imagery from GIBS is currently only available
    //    in the geographic projection (also known as equirectangular,
    //    equidistant cylindrical, or EPSG:4326). We realize that many
    //    web mapping clients require tiles to be in the web mercator
    //    projection system (e.g., Google Maps, OpenStreetMap) and are
    //    actively working to provide imagery in both formats.
    // -- The ordering of Key-Value Pairs for WMTS or TWMS requests is
    //    relatively inflexible; the servers are configured to respond to
    //    the parameter ordering used by popular map clients (see
    //    Supported Clients).

    // Cesium
    // - WMTS options: https://cesiumjs.org/Cesium/Build/Documentation/WebMapTileServiceImageryProvider.html
    // - WMTS Code: Cesium-1.1/Source/Scene/WebMapTileServiceImageryProvider.js
    // Gets back images! Request URLs look like:
    // http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=1&LAYER=MODIS_Terra_CorrectedReflectance_TrueColor&STYLE=&TILEROW=0&TILECOL=1&TILEMATRIXSET=EPSG4326_250m&FORMAT=image/jpeg

    // TODO: Getting bad request for some tiles: [ask Cesium folks? is it EPSG4326 projection issues?]
    // http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=3&LAYER=MODIS_Terra_CorrectedReflectance_TrueColor&STYLE=&TILEROW=6&TILECOL=6&TILEMATRIXSET=EPSG4326_250m&FORMAT=image/jpeg
    // <Exception exceptionCode="TileOutOfRange" locator="TILEROW">
    //   <ExceptionText>TILEROW is out of range, maximum value is 4</ExceptionText>

    // We may have to spec a TilingScheme to be GeographicTilingScheme
    // with the max number of horz and vert tiles in each direction,
    // from the XML capabilities for the dataset.
    // https://cesiumjs.org/Cesium/Build/Documentation/GeographicTilingScheme.html

    // I can manually append to the url &time=2014-01-01 or similar, but
    // will have to hack the Cesium code to support this.

    var credit = new Credit('NASA', 'http://nsidc.org/images/logo_nasa_42x35.gif',
                            'https://earthdata.nasa.gov/about-eosdis/system-description/global-imagery-browse-services-gibs/gibs-access-methods');
    var nasa_gibs_endpoint = 'http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi'; // Cesium appends '?' if needed
    
    var eosdisSrc = 'modis';    // default to visiable vie
    if (endUserOptions.eosdisSrc) {
        eosdisSrc = endUserOptions.eosdisSrc;
    }
    var sources = {'modis':   {'layer': 'MODIS_Terra_CorrectedReflectance_TrueColor',
                                  'tmsid': 'EPSG4326_250m',
                                  'format': 'image/jpeg'},
                      'airs':    {'layer': 'AIRS_CO_Total_Column_Day',
                                  'tmsid': 'EPSG4326_2km',
                                  'format': 'image/png'},
                      'mlstmp':  {'layer': 'MLS_Temperature_46hPa_Day',
                                  'tmsid': 'EPSG4326_2km',
                                  'format': 'image/png'},
                      'landtmp': {'layer': 'MODIS_Terra_Land_Surface_Temp_Day',
                                  'tmsid': 'EPSG4326_1km',
                                  'format': 'image/png'},
                      'omiaero': {'layer': 'OMI_Aerosol_Index',
                                  'tmsid': 'EPSG4326_2km',
                                  'format': 'image/png'},
                      'refs':    {'layer': 'Reference_Features',
                                  'tmsid': 'EPSG4326_250m',
                                  'format': 'image/png'},
                      'seatemp': {'layer': 'Sea_Surface_Temp_Blended',
                                  'tmsid': 'EPSG4326_1km',
                                  'format': 'image/png'},
                      'viirs':   {'layer': 'VIIRS_CityLights_2012',
                                  'tmsid': 'EPSG4326_500m',
                                  'format': 'image/jpeg'},
                     };
    var nasaSource = sources[eosdisSrc];

    var wmts = new WebMapTileServiceImageryProvider({
        url: nasa_gibs_endpoint,
        layer: nasaSource.layer,//'MODIS_Terra_CorrectedReflectance_TrueColor',
        tileMatrixSetID: nasaSource.tmsid,//'EPSG4326_250m',
        format: nasaSource.format, //'image/jpeg',   // default is jpeg
        tilingScheme: new GeographicTilingScheme(), // default is WebMercator, not having effect
        tileWidth: 512,
        tileHeight: 512,
        // tileWidth and tileHeight don't seem to affect URL or display
        style: '',       // required but '' or 'default' don't change things
        maximumLevel: 9,
        credit: credit,
        time: '2014-01-01',     // not added to URL, need to hack code :-(
    });

    // var wmts = new WebMapTileServiceImageryProvider({
    //     url: 'http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi',
    //     layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    //     tileMatrixSetID: 'EPSG4326_250m',
    //     format: 'image/jpeg',
    //     style: '',
    // });


    // NASA GIBS: Tiled WMS 
    // http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi?request=GetCapabilities

    // Uh oh, perhaps not complete enough for Cesium?
    //   Tiled WMS Server maintained by LANCE. Not a full WMS. This file only maintained for WorldWind.
    // Requests (what's the diff in last 2?): GetCapabilities, GetMap, GetTileService

    // XML out, e.g. for one of the above:

    // <Layer queryable="0">
    //   <Name>MODIS_Terra_CorrectedReflectance_TrueColor</Name>
    //   <Title>MODIS_Terra_CorrectedReflectance_TrueColor Title</Title>
    //   <Abstract>
    //     MODIS_Terra_CorrectedReflectance_TrueColor Abstract
    //   </Abstract>
    //   <LatLonBoundingBox minx="-180" miny="-90" maxx="180" maxy="90"/>
    //   <Style>
    //     <Name>default</Name>
    //     <Title>(default) Default style</Title>
    //   </Style>
    //   <Dimension name="time" units="ISO8601" default="2014-09-23" multipleValues="0" nearestValue="0" current="0">2012-05-08/2014-09-23/P1D</Dimension>
    //   <ScaleHint min="10" max="100"/>
    //   <MinScaleDenominator>100</MinScaleDenominator>
    // </Layer>

    // 
    // As described in the introduction, the Tiled WMS server offers fast
    // response to a limited number of WMS access patterns - specifically
    // those access patterns which provide geographic bounds which fall along
    // the edges of pregenerated tiles.
    //
    // Those patterns are described in the TWMS GetTileService request. The
    // response is an XML encoded list of available WMS access patterns. A
    // TiledPattern access pattern is a set gridded WMS requests, where
    // parameter order, case and content are constant, with the exception of
    // the bbox values. Using this pattern allows fast access to tiles for a
    // given combination of layers and associated styles at a given
    // resolution over a defined area.

    // NASA Tile Pattern described at: http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi?request=GetTileService
    // For example, our Terra_Corrected (time=${time} appears optional):
    // request=GetMap&layers=MODIS_Terra_CorrectedReflectance_TrueColor&srs=EPSG:4326&format=image%2Fjpeg&styles=&width=512&height=512&bbox=-180,81,-171,90
    //
    // Prefixing with URL endpoint (I get what appears a fractured image):
    // http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi?request=GetMap&layers=MODIS_Terra_CorrectedReflectance_TrueColor&srs=EPSG:4326&format=image%2Fjpeg&styles=&time=2014-09-12&width=512&height=512&bbox=-180,88.875,-178.875,90

    // I can hack in Cesium's service and version and see images:
    // http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi?service=WMS&version=1.1.1&request=GetMap&layers=MODIS_Terra_CorrectedReflectance_TrueColor&srs=EPSG:4326&format=image%2Fjpeg&styles=&time=2014-09-12&width=512&height=512&bbox=-180,88.875,-178.875,90

    // After hacking the order in WebMapServiceImageryProvider.js, no image still:
    // http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi?service=WMS&version=1.1.1&request=GetMap&layers=MODIS_Terra_CorrectedReflectance_TrueColor&srs=EPSG:4326&format=image%2Fjpeg&styles=&time=2014-09-12&width=512&height=512&bbox=0,-90,180,90&
    // http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi?service=WMS&version=1.1.1&request=GetMap&layers=MODIS_Terra_CorrectedReflectance_TrueColor&srs=EPSG:4326&format=image%2Fjpeg&styles=&time=2014-09-12&width=512&height=512&bbox=90,0,180,90&

    // Cesiumgetmap requests URL like below and gets black, why?:
    // http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi?service=WMS&version=1.1.1&request=GetMap&styles=&format=image/jpeg&layers=MODIS_Terra_CorrectedReflectance_TrueColor&srs=EPSG:4326&bbox=-90,0,0,90&width=256&height=256&

    // If I add in time= I get same black for requested URL like:
    // http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi?service=WMS&version=1.1.1&request=GetMap&styles=&format=image/jpeg&time=2014-09-12&layers=MODIS_Terra_CorrectedReflectance_TrueColor&srs=EPSG:4326&bbox=0,-90,180,90&width=256&height=256&

    // why isn't MY parameters overriding default {service:'WMS', version:'1.1.1', request:'GetMap', styles:'', format:'image/jpeg'
    // 2014-09-23 I give up, can't seem to get anything that seems right, even the sample images I pull seem "torn" and broken, or else all black.

    // var twms = new WebMapServiceImageryProvider({
    //     url: 'http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi',
    //     layers: nasaSource.layer,// TWMS is PLURAL 'MODIS_Terra_CorrectedReflectance_TrueColor',
    //     tilingScheme: new GeographicTilingScheme(), // no change
    //     //parameters: {'time':'2014-09-12'}, // {'HI':'MOM'} becomes &hi=MOM&
    //     enablePickFeatures: true,
    //     //getFeatureInfoParameters: wtf,
    //     getFeatureInfoAsXml: true, // it never asks NASA for Get
    //     //rectangle: wtf,
    //     //tilingScheme: new GeographicTilingScheme(),
    //     tileWidth: 512,
    //     tileHeight: 512,
    // });
        
    // imageryProvider = twms;
    // wmts works, but image not wrapped quite right:
    imageryProvider = wmts;

    var viewer;
    try {
        viewer = new Viewer('cesiumContainer', {
            imageryProvider : imageryProvider,
            baseLayerPicker : !defined(imageryProvider),
            scene3DOnly : endUserOptions.scene3DOnly
        });
    } catch (exception) {
        loadingIndicator.style.display = 'none';
        var message = formatError(exception);
        console.error(message);
        if (!document.querySelector('.cesium-widget-errorPanel')) {
            window.alert(message);
        }
        return;
    }

    viewer.extend(viewerDragDropMixin);
    viewer.extend(viewerEntityMixin);
    if (endUserOptions.inspector) {
        viewer.extend(viewerCesiumInspectorMixin);
    }

    var showLoadError = function(name, error) {
        var title = 'An error occurred while loading the file: ' + name;
        var message = 'An error occurred while loading the file, which may indicate that it is invalid.  A detailed error report is below:';
        viewer.cesiumWidget.showErrorPanel(title, message, error);
    };

    viewer.dropError.addEventListener(function(viewerArg, name, error) {
        showLoadError(name, error);
    });

    var scene = viewer.scene;
    var context = scene.context;
    if (endUserOptions.debug) {
        context.validateShaderProgram = true;
        context.validateFramebuffer = true;
        context.logShaderCompilation = true;
        context.throwOnWebGLError = true;
    }

    var source = endUserOptions.source;
    if (defined(source)) {
        var dataSource;
        var loadPromise;

        if (/\.czml$/i.test(source)) {
            dataSource = new CzmlDataSource(getFilenameFromUri(source));
            loadPromise = dataSource.loadUrl(source);
        } else if (/\.geojson$/i.test(source) || /\.json$/i.test(source) || /\.topojson$/i.test(source)) {
            dataSource = new GeoJsonDataSource(getFilenameFromUri(source));
            loadPromise = dataSource.loadUrl(source);
        } else {
            showLoadError(source, 'Unknown format.');
        }

        if (defined(dataSource)) {
            viewer.dataSources.add(dataSource);

            loadPromise.then(function() {
                var lookAt = endUserOptions.lookAt;
                if (defined(lookAt)) {
                    var entity = dataSource.entities.getById(lookAt);
                    if (defined(entity)) {
                        viewer.trackedEntity = entity;
                    } else {
                        var error = 'No entity with id "' + lookAt + '" exists in the provided data source.';
                        showLoadError(source, error);
                    }
                }
            }).otherwise(function(error) {
                showLoadError(source, error);
            });
        }
    }

    if (endUserOptions.stats) {
        scene.debugShowFramesPerSecond = true;
    }

    var theme = endUserOptions.theme;
    if (defined(theme)) {
        if (endUserOptions.theme === 'lighter') {
            document.body.classList.add('cesium-lighter');
            viewer.animation.applyThemeChanges();
        } else {
            var error = 'Unknown theme: ' + theme;
            viewer.cesiumWidget.showErrorPanel(error, '');
        }
    }

    loadingIndicator.style.display = 'none';
});
