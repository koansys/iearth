==========================
 README GSFC Data Sources
==========================

We have to use WebMercator else the wrapping of the GSFC data on the Earth is skewed.
Problem reported to Cesium group and they said tiles appeared strange. 

GSFC Docs
=========

https://earthdata.nasa.gov/about-eosdis/system-description/global-imagery-browse-services-gibs/gibs-supported-clients#web_based_clients

List of endpoints including Geographic (EPSG:4326), WebMercator (EPSG:3857)
https://wiki.earthdata.nasa.gov/display/GIBS/GIBS+API+for+Developers#GIBSAPIforDevelopers-ServiceEndpointsandGetCapabilities


Trying to get at products
=========================

2014-09-16
NASA
- NASA offers WMTS and Tile WMS; try the former for now;
- WMTS in KVP or REST (Cesium-1.1 only supports KVP, with certain orders!)
- KVP: http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?...
- NASA appears to have some hacked params that Cesium can't support, like 'time'.
- CAUTION: NASA parameters must currently be ordered in a specific way as noted here.
- OpenLayers example:
-- https://earthdata.nasa.gov/about-eosdis/system-description/global-imagery-browse-services-gibs/gibs-supported-clients#web_based_clients
- Important Notes
-- Non-polar tiled imagery from GIBS is currently only available
   in the geographic projection (also known as equirectangular,
   equidistant cylindrical, or EPSG:4326). We realize that many
   web mapping clients require tiles to be in the web mercator
   projection system (e.g., Google Maps, OpenStreetMap) and are
   actively working to provide imagery in both formats.
-- The ordering of Key-Value Pairs for WMTS or TWMS requests is
   relatively inflexible; the servers are configured to respond to
   the parameter ordering used by popular map clients (see
   Supported Clients).

Cesium
- WMTS options: https://cesiumjs.org/Cesium/Build/Documentation/WebMapTileServiceImageryProvider.html
- WMTS Code: Cesium-1.1/Source/Scene/WebMapTileServiceImageryProvider.js
Gets back images! Request URLs look like:
http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=1&LAYER=MODIS_Terra_CorrectedReflectance_TrueColor&STYLE=&TILEROW=0&TILECOL=1&TILEMATRIXSET=EPSG4326_250m&FORMAT=image/jpeg

TODO: Getting bad request for some tiles: [ask Cesium folks? is it EPSG4326 projection issues?]
http://map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=3&LAYER=MODIS_Terra_CorrectedReflectance_TrueColor&STYLE=&TILEROW=6&TILECOL=6&TILEMATRIXSET=EPSG4326_250m&FORMAT=image/jpeg
<Exception exceptionCode="TileOutOfRange" locator="TILEROW">
  <ExceptionText>TILEROW is out of range, maximum value is 4</ExceptionText>

We may have to spec a TilingScheme to be GeographicTilingScheme
with the max number of horz and vert tiles in each direction,
from the XML capabilities for the dataset.
https://cesiumjs.org/Cesium/Build/Documentation/GeographicTilingScheme.html

I can manually append to the url &time=2014-01-01 or similar, but
will have to hack the Cesium code to support this.



List of endpoints including Geographic (EPSG:4326), WebMercator (EPSG:3857)
https://wiki.earthdata.nasa.gov/display/GIBS/GIBS+API+for+Developers#GIBSAPIforDevelopers-ServiceEndpointsandGetCapabilities

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
    //imageryProvider = wmts;


So many standards to chose from
===============================

WMTS: OpenGIS Web Map Tile Service 

TWMS: 

WebMercator:

EPSG:4326: Non-polar tiled imagery from GIBS is currently only
available in the geographic projection (also known as equirectangular,
equidistant cylindrical, or EPSG:4326)

EPSG:3857: WebMercatorProjection: used by Google Maps, Bing Maps, ESRI ArcGIS Online



WebMercator works, products
===========================

Web Mercator - EPSG:3857, WMTS version 1.0.0
KVP endpoint:         http://map1.vis.earthdata.nasa.gov/wmts-webmerc/wmts.cgi 
KVP GetCapabilities:  http://map1.vis.earthdata.nasa.gov/wmts-webmerc/wmts.cgi?SERVICE=WMTS&request=GetCapabilities
REST endpoint:        http://map1.vis.earthdata.nasa.gov/wmts-webmerc/
REST GetCapabilities: http://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/WMTSCapabilities.xml

I think Cesium does KVP but not REST now.

Both GetCapabilities requests return the same XML output.




Working WebMercator
===================

::
    var gibs_endpoint_web_mercator = 'http://map1.vis.earthdata.nasa.gov/wmts-webmerc/wmts.cgi';
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
    imageryProvider = wmts_webmerc;


Date-based data
===============


For the KVP queries, we can simply suffix with DATE=YYYY-MM-DD like:

http://map1.vis.earthdata.nasa.gov/wmts-webmerc/wmts.cgi?service=WMTS&VERSION=1.0.0&request=GetTile&TILEMATRIX=1&LAYER=MODIS_Terra_Land_Surface_Temp_Day&STYLE=&TILEROW=0&TILECOL=0&TILEMATRIXSET=GoogleMapsCompatible_Level7&FORMAT=image/png&TIME=2013-01-05

