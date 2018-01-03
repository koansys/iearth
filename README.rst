===============
 iEarth README
===============

In 2014 I was trying to leverage the work we did with the iSat
satellite tracker: we wanted to see what other science data
we could visualize on the Cesium globe.

I found that I could get earthquake and other disaster data and
convert it to Cesium's CZML format and plot it directly -- very nice.

Four years later, I'd like to ressurect this a bit. My old Cesium-1.1
no longer runs so we got a new one and will have to rebuild some of
the satellite map data to display on it.

Serve the Cesium Globe
======================

Cesium's advanced a lot but this should get you going. I've vendored
Cesium-1.41 here. You can serve this directory with any web server,
but it won't render with just a "file:///Users/..." URL.

Using Python2::

  cd Cesium-1.41
  python -m SimpleHTTPServer 8000

With python3::

  cd Cesium-1.41
  python -m http.server 8000

With Node (from the Cesium Downloads page)::

  cd Cesium-1.41
  npm install
  node server.js --port=8000

Then point your browser at:
http://localhost:8000/Apps/CesiumViewer/index.html

Earthquakes
===========

You can use the sample `quakes.czml` file here: just drag it onto the
globe, give it a few seconds to process, and watch the earthquakes
appear over time. You can zoom in and then click on them to get their
name, magnitude, depth, etc.

Or get a recent CSV from under the feed link:
http://earthquake.usgs.gov/earthquakes/feed/
for example:
http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.csv

Run quake-csvtoczml.py against it to create CZML, e.g.::

  ./quake-csvtoczml.py ~/Downloads/2.5_month.csv

  datemin=20171204T220835.680Z datemax=20180103T195928.730Z
  Wrote CZML to /Users/chris/Downloads/2.5_month.csv.czml

Sorry, this currently only works with python2. Work in progress.

It generates data to plot earthquakes at their lat/lon with a dot
sized and colored by the intensity and a line length into the earth
showing its depth.

Drag your new czml file to the globe and give it a few seconds to process.

Fires
=====

There are similar datasets and a conversion program here for fires.
Docs TBD.

Earth Satellite Data
====================

I had been working on getting Earth satellite data to render from near
realtime feeds (e.g., MODIS) and had success with some datasets but
had projection problems with others.

I need to try to get this rendering again. The Cesium-1.1 file is
brutally hacked to make this work as a proof of concept but no longer
renders, so try again with a modern Cesium.


Static Website Hosting on S3
============================

The cool thing is that Cesium runs in the browser so we can upload it
to S3 and serve as a static website for almost nothing.  Create a
bucket, turn on Static WebSite Hosting, then upload the Cesium
directory (sans the node_modules) while turning on public read for
every object::

  aws s3 sync --acl public-read . s3://iearth.v-studios.com/

Extra points for setting a DNS in Route53 to point at it. Then just
browse to it and drop in your CZML file of choice.
