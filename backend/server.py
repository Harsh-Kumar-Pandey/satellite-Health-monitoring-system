from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import joblib
import numpy as np

app = Flask(__name__)
CORS(app)

# ── Load Model, Scaler & Data ─────────────────────────────────────────────────
model  = joblib.load('satellite_model.pkl')
scaler = joblib.load('satellite_scaler.pkl')
df     = pd.read_csv('satellite_data.csv')

FEATURES = [
    'temperature', 'voltage', 'current',
    'battery_level', 'signal_strength',
    'solar_panel_output', 'orbit_altitude'
]

LIMITS = {'temperature': 60, 'voltage': 15, 'current': 5}

print(f"Server started. Loaded {len(df)} rows from satellite_data.csv")

# ── Run ML predictions on the entire CSV once at startup ──────────────────────
# (We pre-calculate everything so the live stream is lightning fast)
X      = df[FEATURES]
scaled = scaler.transform(X)
df['prediction']  = model.predict(scaled)
df['is_fault']    = df['prediction'].apply(lambda x: 0 if x == 'healthy' else 1)
df['confidence']  = np.max(model.predict_proba(scaled), axis=1).round(3)

print(f"Predictions done. Faults found: {df['is_fault'].sum()}")

# ── Global state for the Live Simulation ──────────────────────────────────────
current_index = 0


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# ── GET /api/stream ───────────────────────────────────────────────────────────
# NEW: Serves one row of data at a time to simulate a live telemetry feed
@app.route('/api/stream', methods=['GET'])
def stream():
    global current_index
    
    # Grab the current row and convert to a dictionary
    row_data = df.iloc[current_index].to_dict()
    
    # Convert numpy types to native Python types so JSON can read them
    for key, value in row_data.items():
        if isinstance(value, np.generic):
            row_data[key] = value.item()
            
    # Move the index forward by 1. If it hits the end, loop back to 0.
    current_index = (current_index + 1) % len(df)
    
    return jsonify(row_data)


# ── GET /api/summary ──────────────────────────────────────────────────────────
@app.route('/api/summary', methods=['GET'])
def summary():
    total       = len(df)
    total_faults = int(df['is_fault'].sum())
    health_pct  = round((1 - total_faults / total) * 100, 1)

    fault_breakdown = df[df['is_fault'] == 1]['prediction'].value_counts().to_dict()

    return jsonify({
        'total_readings':  total,
        'total_faults':    total_faults,
        'healthy_count':   total - total_faults,
        'health_percent':  health_pct,
        'fault_breakdown': fault_breakdown,
        'avg_temperature': round(df['temperature'].mean(), 2),
        'avg_voltage':     round(df['voltage'].mean(), 2),
        'avg_current':     round(df['current'].mean(), 2),
    })


# ── GET /api/telemetry?limit=100&offset=0 ─────────────────────────────────────
@app.route('/api/telemetry', methods=['GET'])
def telemetry():
    limit  = int(request.args.get('limit',  100))
    offset = int(request.args.get('offset', 0))

    slice_df = df.iloc[offset: offset + limit]

    records = slice_df[[
        'timestamp', 'temperature', 'voltage', 'current',
        'battery_level', 'signal_strength', 'solar_panel_output',
        'orbit_altitude', 'prediction', 'is_fault', 'confidence'
    ]].to_dict(orient='records')

    return jsonify({
        'total':   len(df),
        'offset':  offset,
        'limit':   limit,
        'records': records
    })


# ── GET /api/faults ───────────────────────────────────────────────────────────
@app.route('/api/faults', methods=['GET'])
def faults():
    limit    = int(request.args.get('limit', 50))
    fault_df = df[df['is_fault'] == 1].tail(limit)

    records = fault_df[[
        'timestamp', 'temperature', 'voltage', 'current',
        'battery_level', 'prediction', 'confidence'
    ]].to_dict(orient='records')

    return jsonify({
        'total_faults': int(df['is_fault'].sum()),
        'records':      records
    })


# ── GET /api/charts/timeseries ────────────────────────────────────────────────
@app.route('/api/charts/timeseries', methods=['GET'])
def timeseries():
    sample = df.iloc[::max(1, len(df) // 200)]

    return jsonify({
        'timestamps':   sample['timestamp'].tolist(),
        'temperature':  sample['temperature'].tolist(),
        'voltage':      sample['voltage'].tolist(),
        'current':      sample['current'].tolist(),
        'is_fault':     sample['is_fault'].tolist()
    })


# ── GET /api/charts/fault_distribution ───────────────────────────────────────
@app.route('/api/charts/fault_distribution', methods=['GET'])
def fault_distribution():
    counts = df['prediction'].value_counts().to_dict()
    return jsonify({
        'labels': list(counts.keys()),
        'values': list(counts.values())
    })


# ── GET /api/charts/health_trend ─────────────────────────────────────────────
@app.route('/api/charts/health_trend', methods=['GET'])
def health_trend():
    bucket_size = 50
    buckets = []
    for i in range(0, len(df), bucket_size):
        chunk = df.iloc[i: i + bucket_size]
        healthy_pct = round((1 - chunk['is_fault'].mean()) * 100, 1)
        buckets.append({
            'bucket':      i // bucket_size + 1,
            'timestamp':   chunk['timestamp'].iloc[0],
            'health_pct':  healthy_pct
        })

    return jsonify(buckets)


# ── POST /api/predict_single ──────────────────────────────────────────────────
@app.route('/api/predict_single', methods=['POST'])
def predict_single():
    data = request.json
    try:
        features = [[
            float(data['temperature']),
            float(data['voltage']),
            float(data['current']),
            float(data.get('battery_level',      80)),
            float(data.get('signal_strength',   -70)),
            float(data.get('solar_panel_output',  25)),
            float(data.get('orbit_altitude',     500))
        ]]
    except (KeyError, ValueError) as e:
        return jsonify({'error': f'Invalid input: {e}'}), 400

    scaled     = scaler.transform(features)
    prediction = model.predict(scaled)[0]
    confidence = round(float(np.max(model.predict_proba(scaled))), 3)

    exceeded = []
    for param, limit in LIMITS.items():
        val = float(data.get(param, 0))
        if val > limit:
            exceeded.append({
                'parameter': param,
                'value':     round(val, 2),
                'limit':     limit,
                'excess':    round(val - limit, 2)
            })

    return jsonify({
        'prediction': prediction,
        'confidence': confidence,
        'is_fault':   prediction != 'healthy',
        'exceeded':   exceeded
    })


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)