/*global define*/
define([
        'Core/Cartesian2',
        'Core/Credit',
        'Core/defined',
        'Core/formatError',
        'Core/getFilenameFromUri',
        'Core/GeographicTilingScheme',
        'Core/Rectangle',
        'Core/WebMercatorTilingScheme',
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
        Cartesian2,
        Credit,
        defined,
        formatError,
        getFilenameFromUri,
        GeographicTilingScheme,
        Rectangle,
        WebMercatorTilingScheme,
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

    // I can manually append to the url &time=2014-01-01 or similar, but
    // will have to hack the Cesium code to support this.

    // List of endpoints including Geographic (EPSG:4326), WebMercator (EPSG:3857)
    // https://wiki.earthdata.nasa.gov/display/GIBS/GIBS+API+for+Developers#GIBSAPIforDevelopers-ServiceEndpointsandGetCapabilities
        
    var gibs_endpoint_web_mercator = 'http://map1.vis.earthdata.nasa.gov/wmts-webmerc/wmts.cgi';

    var eosdisSrc = 'modis';    // default to visiable vie
    if (endUserOptions.eosdisSrc) {
        eosdisSrc = endUserOptions.eosdisSrc;
    }

    // GetCapabilities doesn't provide the tile size?? perhaps in the header?
    // layer:  <ows:Identfier>...</ows:Identifier>
    // tmsid:  <TileMatrixSetLink><TileMatrixSet>...</TileMatrixSet></TileMatrixSetLink>
    // format: <Format>...</Format> 

    // We get empty images for seatemp, seatempir.
    // If we ask for bogus TILEMATRIXSET we see HTTP 400 so we're asking for the right thing; seems there's no data there

    // landtmp ok: http://map1.vis.earthdata.nasa.gov/wmts-webmerc/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=1&LAYER=MODIS_Terra_Land_Surface_Temp_Day&STYLE=&TILEROW=0&TILECOL=0&TILEMATRIXSET=GoogleMapsCompatible_Level7&FORMAT=image/png
    // omiaero ok: http://map1.vis.earthdata.nasa.gov/wmts-webmerc/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=6&LAYER=OMI_Aerosol_Index                &STYLE=&TILEROW=22&TILECOL=33&TILEMATRIXSET=GoogleMapsCompatible_Level6&FORMAT=image/png
    // seatemp NO: http://map1.vis.earthdata.nasa.gov/wmts-webmerc/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=2&LAYER=Sea_Surface_Temp_Infrared        &STYLE=&TILEROW=0&TILECOL=2&TILEMATRIXSET=GoogleMapsCompatible_Level8&FORMAT=image/png
    // Asking for a date 5 days back gives me pixels for IR but not Blended; is the WebMercator product delayed? I thought we had today's :
    //             http://map1.vis.earthdata.nasa.gov/wmts-webmerc/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=2&LAYER=Sea_Surface_Temp_Infrared        &STYLE=&TILEROW=0&TILECOL=2&TILEMATRIXSET=GoogleMapsCompatible_Level8&FORMAT=image/png&TIME=2014-11-19

    var webmercs = {'modis':   {'layer': 'MODIS_Terra_CorrectedReflectance_TrueColor',
                                'tmsid': 'GoogleMapsCompatible_Level9',
                                'format': 'image/jpeg'},
                    'airs':    {'layer': 'AIRS_CO_Total_Column_Day',
                                'tmsid': 'GoogleMapsCompatible_Level6',
                                'format': 'image/png'},
                    'mlstmp':  {'layer': 'MLS_Temperature_46hPa_Day',
                                'tmsid': 'GoogleMapsCompatible_Level6',
                                'format': 'image/png'},
                    'landtmp': {'layer': 'MODIS_Terra_Land_Surface_Temp_Day',
                                'tmsid': 'GoogleMapsCompatible_Level7',
                                'format': 'image/png'},
                    'omiaero': {'layer': 'OMI_Aerosol_Index',
                                'tmsid': 'GoogleMapsCompatible_Level6',
                                'format': 'image/png'},
                    'refs':    {'layer': 'Reference_Features',
                                'tmsid': 'GoogleMapsCompatible_Level9',
                                'format': 'image/png'},
                    // PROBLEM: returns a blue globe with no pixels, but no errors; image is empty
                    'seatemp': {'layer': 'Sea_Surface_Temp_Blended',
                                'tmsid': 'GoogleMapsCompatible_Level7',
                                'format': 'image/png'},
                    'seatempir': {'layer': 'Sea_Surface_Temp_Infrared',
                                  'tmsid': 'GoogleMapsCompatible_Level8',
                                  'format': 'image/png'},
                    'viirs':   {'layer': 'VIIRS_CityLights_2012',
                                'tmsid': 'GoogleMapsCompatible_Level8',
                                'format': 'image/jpeg'},
                     };

    var webmerc_src = webmercs[eosdisSrc];

    var wmts_webmerc = new WebMapTileServiceImageryProvider({
        url: gibs_endpoint_web_mercator,
        layer: webmerc_src.layer,
        tileMatrixSetID: webmerc_src.tmsid,
        format: webmerc_src.format,
        style: '',
        credit: 'WebMercator: ' + webmerc_src.layer + ' ' + webmerc_src.tmsid,
        time: '2014-01-01',     // not added to URL, need to hack code :-(
    });

    var imageryProvider = wmts_webmerc;

    ///////////////////////////////////////////////////////////////////////////
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
