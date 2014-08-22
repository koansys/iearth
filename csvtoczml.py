#!/usr/bin/env python
# convert USGS earthquake CSV to CZML
#time,latitude,longitude,depth,mag,magType,nst,gap,dmin,rms,net,id,updated,place,type
# depth is Km, Cesium uses meters

# zcml: https://github.com/AnalyticalGraphicsInc/cesium/wiki/CZML-Structure

import csv
import datetime
import json

CSVFILE = '2.5_month.csv'

quakes = [{'id': 'document', 'version': '1.0'}]

# We can use negative height for depth below surface but zooming takes us to blackness underground
# Maybe put on surface and color code for depth
# or make line from surface to *above* at height to give a sense of depth.
# Intuitively, line height is good for magnitude
# Use color for depth?

with open(CSVFILE, 'r') as csvfile:
    cr = csv.DictReader(csvfile)
    for row in cr:
        time = row['time']       # 2014-08-21T13:37:43.000Z, we need 20120101T000000Z
        time = time.replace('-', '').replace(':', '').replace('.000', '')
        now = datetime.datetime.now().isoformat().replace('-', '').replace(':', '')[:15] + 'Z'
        lon = float(row['longitude'])
        lat = float(row['latitude'])
        depth = float(row['depth']) * 1000.0
        quake = { 'id': row['id'],
                  'position': {'cartographicDegrees': [lon, lat, 0.0]},
                  'availability': time + '/' + now,
                  'name': row['place'],
                  'label': {'text': row['place'], 'show': False, 'scale': 1.0},
                  # Seems we have to have > 2 points, not just 2
                  'polyline': {
                      'positions': {'cartographicDegrees': [lon, lat, -1 * depth,
                                                            lon, lat, 0.0,
                                                            lon, lat, depth]},
                      "material": { "solidColor": { "color": { "rgba": [ 255, 127, 127, 153 ] } } },
                      #'width': {'number': 10},
                      'show': True,
                  },
                  'point': {
                      'color': {'rgba': [255, 255, 0, 255] },
                      'pixelSize': float(row['mag']) * 2,
                  },
        }
        quakes.append(quake)

print json.dumps(quakes, indent=4, sort_keys=True)

