#!/usr/bin/env python
# convert USGS earthquake CSV to CZML
# zcml: https://github.com/AnalyticalGraphicsInc/cesium/wiki/CZML-Structure
# CSV: time,latitude,longitude,depth,mag,magType,nst,gap,dmin,rms,net,id,updated,place,type
#      depth is Km, Cesium uses meters

# Plot lat/lon on surface sized and colored by magnitude,
# and draw line down to depth.
# Drag resulting ZCML file to Cesium:
#  http://cesiumjs.org/Cesium/Build/Apps/CesiumViewer/index.html

# TODO: Use the Python CZML library (no usage docs)
# https://github.com/cleder/czml

import csv
import datetime
import json
import logging

CSVFILE = '2.5_month.csv'
MIN_MAG = 2.5
MAX_MAG = 6.0

now = datetime.datetime.now().isoformat().replace('-', '').replace(':', '')[:15] + 'Z'
quakes = [{'id': 'document', 'version': '1.0'}]

with open(CSVFILE, 'r') as csvfile:
    cr = csv.DictReader(csvfile)
    for row in cr:
        time = row['time']       # 2014-08-21T13:37:43.000Z, we need 20120101T000000Z
        time = time.replace('-', '').replace(':', '').replace('.000', '')
        lon = float(row['longitude'])
        lat = float(row['latitude'])
        mag = float(row['mag'])
        depth = float(row['depth']) * 1000.0 # Km to meters
        name_text = "M%.1f d%d %s" % (mag, int(depth/1000.0), row['place'])
        # scale our min/max mag to 0...255
        mag_color = min(255, 255 * max(0, mag - MIN_MAG) / (MAX_MAG - MIN_MAG))
        quake = {'id': row['id'],
                 'availability': time + '/' + now,
                 'name': name_text, #row['place'],
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
print json.dumps(quakes, indent=4, sort_keys=True)


