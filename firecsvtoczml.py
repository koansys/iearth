#!/usr/bin/env python
# Fire data can be found here:
# https://firms.modaps.eosdis.nasa.gov/active_fire/#firms-txt
# Convert it like:
#  firecsvtczml.py MODIS_C6_Global_7d.csv
# Drag resulting CZML file to Cesium:
#  http://cesiumjs.org/Cesium/Build/Apps/CesiumViewer/index.html

#latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp
# Satellite is T=Terra, A=Aqua

# Plot lat, lon, brightness based on timestamp
# what's bright_t31 and frp?

import csv
import datetime
import json
import sys

try:
    CSVFILE = sys.argv[1]
except IndexError:
    raise IndexError('Provide the CSV file with the fire data')
ZCMLFILE = CSVFILE.replace('.csv', '.czml')
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
        if row['satellite'] == 'T':  # Terra, use Red
            rgba = [255, mag_color, 0, 255]
        elif row['satellite'] == 'A':  # Aqua, use Blue
            rgba = [0, mag_color, 255, 255]
        else:
            raise RuntimeError('not T or A satellite=%s', row['satellite'])

        fire = {'id': str(id),
                'availability': datetime + '/' + now,
                'position': {'cartographicDegrees': [row['longitude'], row['latitude'], 0]},
                'point': {'color': {'rgba': rgba},
                          'pixelSize': 5,
                          },
                'name': name,
            }
        fires.append(fire)
        id += 1
with open(ZCMLFILE, 'w') as zcmlfile:
    zcmlfile.write(json.dumps(fires))
