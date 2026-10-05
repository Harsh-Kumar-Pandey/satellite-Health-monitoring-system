import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

# Safe limits (match your server.py)
TEMP_LIMIT  = 80
VOLT_LIMIT  = 15
CURR_LIMIT  = 10

NUM_ROWS = 3000   # change to however many you want

records = []
now = datetime.now()

for i in range(NUM_ROWS):
    timestamp = now - timedelta(minutes=NUM_ROWS - i)

    # Randomly pick a fault scenario
    scenario = random.choices(
        ['healthy', 'temp_fault', 'voltage_fault', 'current_fault', 'multi_fault'],
        weights=[55, 15, 12, 12, 6],
        k=1
    )[0]

    # --- Base healthy readings (within safe limits) ---
    temperature = round(random.uniform(20, TEMP_LIMIT - 1), 2)
    voltage     = round(random.uniform(5,  VOLT_LIMIT - 1), 2)
    current     = round(random.uniform(1,  CURR_LIMIT - 1), 2)

    # --- Inject faults by pushing values over the limit ---
    if scenario == 'temp_fault':
        temperature = round(random.uniform(TEMP_LIMIT + 1, TEMP_LIMIT + 30), 2)

    elif scenario == 'voltage_fault':
        voltage = round(random.uniform(VOLT_LIMIT + 1, VOLT_LIMIT + 10), 2)

    elif scenario == 'current_fault':
        current = round(random.uniform(CURR_LIMIT + 1, CURR_LIMIT + 5), 2)

    elif scenario == 'multi_fault':
        temperature = round(random.uniform(TEMP_LIMIT + 5, TEMP_LIMIT + 20), 2)
        voltage     = round(random.uniform(VOLT_LIMIT + 1, VOLT_LIMIT + 8),  2)

    # Add a small noise to every reading (makes it realistic)
    temperature += round(random.gauss(0, 0.5), 2)
    voltage     += round(random.gauss(0, 0.1), 2)
    current     += round(random.gauss(0, 0.05), 2)

    # Add extra features (makes your ML model much better)
    battery_level    = round(random.uniform(20, 100), 1)
    signal_strength  = round(random.uniform(-120, -40), 1)   # dBm
    solar_panel_output = round(random.uniform(0, 50), 2)     # watts
    orbit_altitude   = round(random.uniform(400, 600), 1)    # km

    records.append({
        'timestamp':          timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        'temperature':        temperature,
        'voltage':            voltage,
        'current':            current,
        'battery_level':      battery_level,
        'signal_strength':    signal_strength,
        'solar_panel_output': solar_panel_output,
        'orbit_altitude':     orbit_altitude,
        'status':             scenario
    })

df = pd.DataFrame(records)

# Save to CSV
df.to_csv('satellite_data.csv', index=False)

# Print a quick summary
print(f"Generated {len(df)} rows")
print("\nClass distribution:")
print(df['status'].value_counts())
print("\nSample rows:")
print(df.head(3).to_string())