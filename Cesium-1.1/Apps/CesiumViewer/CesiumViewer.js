/*global define*/
define([
        'Core/Credit',
        'Core/defined',
        'Core/formatError',
        'Core/getFilenameFromUri',
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
        CzmlDataSource,
        GeoJsonDataSource,
        WebMapServiceImageryProvider,
        WebMapTileServiceImageryProvider,
        Viewer,
        viewerCesiumInspectorMixin,
        viewerDragDropMixin,
        viewerEntityMixin) {
    "use strict";
    /*global console*/

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

        
    // WMTS tiled: http://map1.vis.earthdata.nasa.gov/twms-geo/twms.cgi?request=GetTileService
    //the OGC WMTS "getCapabilities" http:
    //call://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?request=GetCapabilities
    //http://map1.vis.earthdata.nasa.gov/wmts-geo/1.0.0/WMTSCapabilities.xml
    //http://map1.vis.earthdata.nasa.gov/wmts-geo/1.0.0/WMTSCapabilities.xml

    //http://map1.vis.earthdata.nasa.gov/wmts-geo/VIIRS_CityLights_2012/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg
    // TimeMatrixSet: EPSG4326_16km (or EPSG4326_500m?); TileMatrix: 0, 1, 2
    //http://map1.vis.earthdata.nasa.gov/wmts-geo/VIIRS_CityLights_2012/default/EPSG4326_16km/0/{TileRow}/{TileCol}.jpg

        //        Web Map Service (WMS)       - OGC std for a geographic region from distributed geospatial databases.         see WebMapServiceImageryProvider.
        //OpenGIS Web Map Tile Service (WMTS) - OGC std for pre-rendered georeferenced map tiles over the Internet. In Cesium, see WebMap[Tile?]ServiceImageryProvider.
        //Tile Map Service (TMS)              - REST interface for accessing map tiles. Tiles generated with MapTiler or GDAL2Tiles. see TileMapServiceImageryProvider.

        //https://earthdata.nasa.gov/about-eosdis/system-description/global-imagery-browse-services-gibs/gibs-available-imagery-products
        //Access to this imagery is provided via Open Geospatial
        //Consortium (OGC) Web Map Tile Service (WMTS), Tiled WMS
        //(TWMS), and Google Earth KML generation as described in the
        //Access Methods section.
        
        // So use Cesium WebMap[Tile?]ServiceImageryProvider (OGC WTMS) with
        // GIBS the OGC WMTS "getCapabilities" call:
        // http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?request=GetCapabilities
        // http://map1.vis.earthdata.nasa.gov/wmts-geo/1.0.0/WMTSCapabilities.xml
        // Cesium WebMapTileServiceImageryProvider does WMTS 1.0.0 service with KVP requests (not REST, SOAP)

        // Format invalid for Layer:
        //http://map1.vis.earthdata.nasa.gov/wmts-geo/?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=1&LAYER=AMSRE_Brightness_Temp_89H_Day&STYLE=default&TILEROW=1&TILECOL=0&TILEMATRIXSET=EPSG4326_2km&FORMAT=image/jpeg
        // From getTileService query, TilePattern:
        //                                         GetMap&layers=AMSRE_Brightness_Temp_89H_Day&srs=EPSG:4326&format=image%2Fpng&styles=&width=512&height=512&bbox=-180,81,-171,90
        // // GetMap
        //     &layers=AMSRE_Brightness_Temp_89H_Day
        //     &srs=EPSG:4326
        //     &format=image%2Fpng
        //     &styles=
        //     &width=512
        //     &height=512
        //     &bbox=-180,81,-171,90

        // Entered in URL bar or curl, this returns a PNG:
        // http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?request=GetMap&layers=AMSRE_Brightness_Temp_89H_Day&srs=EPSG:4326&format=image%2Fpng&styles=&width=512&height=512&bbox=-180,81,-171,90
        // http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?request=GetTile&layers=AMSRE_Brightness_Temp_89H_Day&srs=EPSG:4326&format=image%2Fpng&styles=&width=512&height=512&bbox=-180,81,-171,90
        //
        // Generated URL throws TILEROW is out of range, maximum value is 4
        // http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=3&LAYER=AMSRE_Brightness_Temp_89H_Day&STYLE=default&TILEROW=7&TILECOL=3&TILEMATRIXSET=EPSG4326_2km&FORMAT=image/png


    var imageryProvider;
    // if (endUserOptions.tmsImageryUrl) {
    //     imageryProvider = new TileMapServiceImageryProvider({
    //         url : endUserOptions.tmsImageryUrl
    //     });
    // }

        
        // This gets some empty tiles then Invalid TILEMATRIX
        // OK:  http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=2&LAYER=AMSRE_Brightness_Temp_89H_Day&STYLE=default&TILEROW=1&TILECOL=3&TILEMATRIXSET=EPSG4326_2km&FORMAT=image/png
        // BAD: http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=9&LAYER=AMSRE_Brightness_Temp_89H_Day&STYLE=default&TILEROW=203&TILECOL=119&TILEMATRIXSET=EPSG4326_2km&FORMAT=image/png
        // TILEROW out of range, max is 2:
        //      http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=2&LAYER=AMSRE_Brightness_Temp_89H_Day&STYLE=default&TILEROW=3&TILECOL=1&TILEMATRIXSET=EPSG4326_2km&FORMAT=image/png

    //http://cesiumjs.org/Cesium/Build/Documentation/WebMapTileServiceImageryProvider.html?classFilter=imageryprovider
    imageryProvider = new WebMapTileServiceImageryProvider({
        url: 'http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi', // maybe without ?request=GEtMap
        format : 'image/png',
        layer : 'AMSRE_Brightness_Temp_89H_Day',
        style : 'default',
        tileMatrixSetID : 'EPSG4326_2km',
        tileWidth : 512,
        tileHeight : 512,
        maximumLevel: 8,        // 19 creates invlid time matrix?
        credit: new Credit('Credit where Credit is Due'),
        // srs : 'EPSG:4326',      // Ignored?
        });
        // 
    // imageryProvider = new WebMapServiceImageryProvider({
    //     url: 'http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi',
    //     layers : 'AMSRE_Brightness_Temp_89H_Day',
    //     style : 'default',
    //     format : 'image/png',
    //     tileMatrixSetID : 'EPSG4326_2km',
    //     tileWidth : 512,
    //     tileHeight : 512,
    //     srs : 'EPSG:4326',
    //     maximumLevel: 8,        // 19 creates invlid time matrix?
    //     });
        // 

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
