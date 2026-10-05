import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

# ── 1. Load Data ──────────────────────────────────────────────────────────────
df = pd.read_csv('satellite_data.csv')

print(f"Total rows: {len(df)}")
print("\nClass distribution:")
print(df['status'].value_counts())

# ── 2. Features & Labels ──────────────────────────────────────────────────────
FEATURES = [
    'temperature', 'voltage', 'current',
    'battery_level', 'signal_strength',
    'solar_panel_output', 'orbit_altitude'
]

X = df[FEATURES]
y = df['status']

# ── 3. Train / Test Split ─────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,       # 80% train, 20% test
    random_state=42,     # reproducible results
    stratify=y           # keeps class ratios equal in both splits
)

print(f"\nTraining samples : {len(X_train)}")
print(f"Testing  samples : {len(X_test)}")

# ── 4. Scale Features ─────────────────────────────────────────────────────────
# StandardScaler makes every feature mean=0, std=1
# This prevents large-range features (temperature) dominating small ones (current)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)   # fit ONLY on training data
X_test_scaled  = scaler.transform(X_test)        # apply same scale to test

# ── 5. Train Model ────────────────────────────────────────────────────────────
model = RandomForestClassifier(
    n_estimators=200,        # number of trees (more = better, but slower)
    max_depth=15,            # prevents overfitting
    min_samples_split=5,
    class_weight='balanced', # handles unequal class sizes automatically
    random_state=42,
    n_jobs=-1                # use all CPU cores
)

print("\nTraining model...")
model.fit(X_train_scaled, y_train)
print("Done.")

# ── 6. Evaluate ───────────────────────────────────────────────────────────────
y_pred = model.predict(X_test_scaled)

accuracy = accuracy_score(y_test, y_pred)
print(f"\nAccuracy: {accuracy * 100:.2f}%")

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# ── 7. Confusion Matrix Plot ──────────────────────────────────────────────────
labels = sorted(y.unique())
cm = confusion_matrix(y_test, y_pred, labels=labels)

plt.figure(figsize=(8, 6))
sns.heatmap(
    cm,
    annot=True, fmt='d',
    xticklabels=labels,
    yticklabels=labels,
    cmap='Blues'
)
plt.title('Confusion Matrix')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=150)
plt.close()
print("\nConfusion matrix saved → confusion_matrix.png")

# ── 8. Feature Importance Plot ────────────────────────────────────────────────
importances = model.feature_importances_
feat_df = pd.DataFrame({
    'feature':    FEATURES,
    'importance': importances
}).sort_values('importance', ascending=True)

plt.figure(figsize=(7, 5))
plt.barh(feat_df['feature'], feat_df['importance'], color='steelblue')
plt.title('Feature Importance')
plt.xlabel('Importance Score')
plt.tight_layout()
plt.savefig('feature_importance.png', dpi=150)
plt.close()
print("Feature importance saved  → feature_importance.png")

# ── 9. Save Model + Scaler ────────────────────────────────────────────────────
joblib.dump(model,  'satellite_model.pkl')
joblib.dump(scaler, 'satellite_scaler.pkl')   # MUST save this alongside the model

print("\nModel  saved → satellite_model.pkl")
print("Scaler saved → satellite_scaler.pkl")
print("\nAll done!")