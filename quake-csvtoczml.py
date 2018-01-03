#!/usr/bin/env python
# convert USGS earthquake CSV to CZML
# czml: https://github.com/AnalyticalGraphicsInc/cesium/wiki/CZML-Structure
# CSV: time,latitude,longitude,depth,mag,magType,nst,gap,dmin,rms,net,id,updated,place,type
#      depth is Km, Cesium uses meters
# Get CSV (or GeoJson or KML) from:
# http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson

# Plot lat/lon on surface sized and colored by magnitude,
# and draw line down to depth.
# Drag resulting CZML file to Cesium:
#  http://cesiumjs.org/Cesium/Build/Apps/CesiumViewer/index.html

# TODO:
# - Use the Python CZML library (no usage docs) https://github.com/cleder/czml
# - Pull CSV (or GeoJSON) live from USGS http://earthquake.usgs.gov/earthquakes/feed/

import csv
import datetime
import json
from sys import argv

try:
    csv_name = argv[1]
except KeyError:
    raise KeyError('Usage: {} <quakefilename.csv>'.format(argv[0]))
MIN_MAG = 2.5
MAX_MAG = 6.0

datemin = None
datemax = None
now = datetime.datetime.utcnow().isoformat().replace('-', '').replace(':', '')[:15] + 'Z'
quakes = [{'id': 'document', 'version': '1.0'}]

with open(csv_name, 'r') as csvfile:
    for row in csv.DictReader(csvfile):
        time = row['time'].replace('-', '').replace(':', '').replace('.000', '')
        if not datemin or datemin > time:
            datemin = time
        if not datemax or datemax < time:
            datemax = time

        lon = float(row['longitude'])
        lat = float(row['latitude'])
        mag = float(row['mag'])
        depth = float(row['depth']) * 1000.0 # Km to meters
        name_text = "M%.1f d%d %s" % (mag, int(depth/1000.0), row['place'])
        # scale our min/max mag to 0...255
        mag_color = min(255, 255 * max(0, mag - MIN_MAG) / (MAX_MAG - MIN_MAG))
        quake = {'id': row['id'],
                 'availability': time + '/' + now,
                 'name': name_text,
                 'position': {'cartographicDegrees': [lon, lat, 0.0]},
                 'point': {
                     'color': {'rgba': [255, mag_color, 0, 255] },
                     'pixelSize': float(row['mag']) * 1.5,
                 },
        }
        if int(depth) > 1.0:    # can't render a line with depth=0
            quake['polyline'] = {
                'positions': {'cartographicDegrees': [lon, lat, -1 * depth,
                                                      lon, lat, 0]},
                "material": { "solidColor": { "color": { "rgba": [ 255, 255, 0, 153 ] } } },
                'show': True,
            }
        quakes.append(quake)

print 'datemin={} datemax={}'.format(datemin, datemax)
czml_name = argv[1] + '.czml'
with open(czml_name, 'w') as czml:
    czml.write(json.dumps(quakes, indent=4, sort_keys=True))
    print 'Wrote CZML to {}'.format(czml_name)

