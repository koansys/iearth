#!/usr/bin/env python
# https://firms.modaps.eosdis.nasa.gov/active_fire/text/Global_24h.csv
# https://firms.modaps.eosdis.nasa.gov/active_fire/text/Global_7d.csv
# Drag resulting ZCML file to Cesium:
#  http://cesiumjs.org/Cesium/Build/Apps/CesiumViewer/index.html

#latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp

# Plot lat, lon, brightness based on timestamp
# what's bright_t31 and frp?

import csv
import datetime
import json

CSVFILE = 'Global_24h.csv'
MIN_MAG = 300
MAX_MAG = 500

now = datetime.datetime.utcnow().isoformat().replace('-', '').replace(':', '')[:15] + 'Z'
fires = [{'id': 'document', 'version': '1.0'}]
id = 0
with open(CSVFILE, 'r') as csvfile:
    for row in csv.DictReader(csvfile):
        date = row['acq_date']  # 2014-08-20
        time = row['acq_time'].strip()  # 0140
        if len(time) != 4:
            raise RuntimeError('Time=%s length != 4' % time)
        datetime = date + 'T' + time[0:2] + ':' + time[2:4] + 'Z'
        mag_color = min(255, 255 * max(0, float(row['brightness']) - MIN_MAG) / (MAX_MAG - MIN_MAG))
        # name = '%s b=%s t31=%s sat=%s/%s/%s' % (
        #     datetime, row['brightness'], row['bright_t31'],
        #     row['satellite'], row['scan'], row['track']),
        name = 'b%s t%s %s/%s/%s' % (
            row['brightness'], row['bright_t31'],
            row['satellite'], row['scan'], row['track']),
        fire = {'id': str(id),
                'availability': datetime + '/' + now,
                'position': {'cartographicDegrees': [row['longitude'], row['latitude'], 0]},
                'point': {'color': {'rgba': [255, mag_color, 0, 255]},
                          'pixelSize': 5,
                          },
                'name': name,
            }
        fires.append(fire)
        id += 1
print json.dumps(fires)


