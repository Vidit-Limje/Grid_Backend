from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np
import logging
import os
import socket
import sys

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Check if port is available
def is_port_available(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('0.0.0.0', port))
            return True
        except socket.error:
            return False

# Check file existence
def check_files_exist(files):
    missing = [f for f in files if not os.path.exists(f)]
    if missing:
        return False, missing
    return True, []

# Load model and transformers
required_files = [
    'grid_maintenance_ensemble_model.pkl',
    'poly_transformer.pkl',
    'scaler.pkl',
    'important_features.txt'
]
files_exist, missing_files = check_files_exist(required_files)
if not files_exist:
    error_msg = f"Missing required files: {missing_files}. Run 'train_model.py' to generate them."
    print(error_msg)
    logging.error(error_msg)
    sys.exit(1)

try:
    model = joblib.load('grid_maintenance_ensemble_model.pkl')
    poly = joblib.load('poly_transformer.pkl')
    scaler = joblib.load('scaler.pkl')
    with open('important_features.txt', 'r') as f:
        important_features = f.read().splitlines()
    logging.info("Model, transformers, and features loaded successfully")
    print("Model, transformers, and features loaded successfully")
except Exception as e:
    error_msg = f"Error loading model or transformers: {e}"
    print(error_msg)
    logging.error(error_msg)
    sys.exit(1)

# Prediction function
def predict_and_recommend(model, new_data, poly, scaler, important_features):
    logging.debug(f"Predicting with data: {new_data}")

    # Reorder columns to match training
    new_data = new_data[['voltage', 'current', 'temperature', 'load', 'time_since_maintenance', 'moisture_level', 'lightning_surge']]
    logging.debug(f"Data after reordering: {new_data.columns.tolist()}")

    # Apply polynomial features
    X_poly = poly.transform(new_data)
    poly_feature_names = poly.get_feature_names_out(new_data.columns)
    X = pd.DataFrame(X_poly, columns=poly_feature_names)

    # Scale all polynomial features
    X_scaled = scaler.transform(X)
    X_scaled = pd.DataFrame(X_scaled, columns=poly_feature_names)

    missing_features = [f for f in important_features if f not in X_scaled.columns]
    if missing_features:
        logging.error(f"Missing important features: {missing_features}")
        raise ValueError(f"Missing important features: {missing_features}")

    X_selected = X_scaled[important_features]
    probabilities = model.predict_proba(X_selected)[:, 1]
    status = ["Failure Present" if prob >= 0.2 else "Failure Not Present" for prob in probabilities]
    logging.info(f"Prediction: probabilities={probabilities.tolist()}, status={status}")
    return status

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        logging.debug(f"Received data: {data}")

        new_data = pd.DataFrame([data])

        required_columns = ['voltage', 'current', 'temperature', 'load', 
                            'time_since_maintenance', 'moisture_level', 'lightning_surge']

        missing_cols = [col for col in required_columns if col not in new_data.columns]
        if missing_cols:
            logging.error(f"Missing columns in input: {missing_cols}")
            return jsonify({'error': f'Missing columns: {missing_cols}'}), 400

        status = predict_and_recommend(model, new_data, poly, scaler, important_features)
        return jsonify({'status': status[0]})

    except Exception as e:
        logging.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({'error': f"Prediction error: {str(e)}"}), 400

if __name__ == '__main__':
    port = 10000
    try:
        print(f"Starting Flask server on http://0.0.0.0:{port}")
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        logging.error(f"Failed to start Flask server: {e}", exc_info=True)
        sys.exit(1)
