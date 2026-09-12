import csv
from datetime import datetime, timedelta
from random import gauss, uniform, randint

path = "telemetry_sample_1000.csv"
start = datetime(2026, 6, 26, 10, 0, 0)
fieldnames = [
    "timestamp",
    "drone_id",
    "latitude",
    "longitude",
    "altitude",
    "battery_voltage",
    "vibration",
    "temperature",
    "humidity",
    "airspeed",
    "yaw",
    "pitch",
    "roll",
]

with open(path, "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    for i in range(1000):
        ts = start + timedelta(seconds=5 * i)
        drone_id = f"DRONE-{randint(1,5):02d}"
        latitude = 40.0 + gauss(0, 0.01)
        longitude = -74.0 + gauss(0, 0.01)
        altitude = max(0, gauss(120, 25))
        battery_voltage = round(max(14.0, min(22.0, gauss(18.5, 1.2))), 2)
        vibration = round(max(0.2, gauss(3.5, 1.7)), 2)
        temperature = round(20 + gauss(0, 5), 1)
        humidity = round(max(20, min(85, gauss(55, 10))), 1)
        airspeed = round(max(0, gauss(12, 4)), 1)
        yaw = round(uniform(0, 360), 1)
        pitch = round(gauss(0, 5), 1)
        roll = round(gauss(0, 5), 1)

        if i % 83 == 0:
            battery_voltage = round(uniform(11.0, 14.0), 2)
        if i % 97 == 0:
            altitude = round(uniform(250, 420), 1)
        if i % 61 == 0:
            vibration = round(uniform(8.0, 12.0), 2)

        writer.writerow(
            {
                "timestamp": ts.isoformat(),
                "drone_id": drone_id,
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "altitude": round(altitude, 1),
                "battery_voltage": battery_voltage,
                "vibration": vibration,
                "temperature": temperature,
                "humidity": humidity,
                "airspeed": airspeed,
                "yaw": yaw,
                "pitch": pitch,
                "roll": roll,
            }
        )

print(f"Created {path}")
