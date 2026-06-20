from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil
import os
import time
from datetime import datetime
import json

from process_image import process_image
from database import init_db, get_db_connection

app = FastAPI()

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Create uploads folder
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Serve uploads as static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def home():
    return {"status": "healthy", "service": "VisionCop AI Backend Running"}

# Upload and Process Endpoint
@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    preprocess_low_light: bool = Form(False),
    preprocess_denoise: bool = Form(False),
    preprocess_contrast: bool = Form(False)
):
    start_time = time.time()
    
    # Save uploaded image
    file_path = f"{UPLOAD_FOLDER}/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Process image with options
    preprocess_options = {
        "low_light": preprocess_low_light,
        "denoise": preprocess_denoise,
        "contrast": preprocess_contrast
    }
    
    result = process_image(file_path, preprocess_options)
    
    processing_time_ms = int((time.time() - start_time) * 1000)
    
    # Save to database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    violations_str = ", ".join(result["violations"])
    timestamp = datetime.now().isoformat()
    
    # Determine vehicle type directly from the CV results
    detected_vehicle = ", ".join(result["vehicles_detected"]) if result.get("vehicles_detected") else "Unknown"
    
    cursor.execute("""
        INSERT INTO violations (
            filename, preprocessed_filename, annotated_filename, 
            timestamp, location, vehicle_type, violations, 
            license_plate, confidence, processing_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        file_path,
        result["preprocessed_image"],
        result["output_image"],
        timestamp,
        "Camera Intersection A-1",
        detected_vehicle,
        violations_str,
        result["license_plate"],
        result["confidence"],
        processing_time_ms
    ))
    
    conn.commit()
    conn.close()

    return {
        "message": "Processing complete",
        "preprocessed_image": result["preprocessed_image"],
        "output_image": result["output_image"],
        "violations": result["violations"],
        "license_plate": result["license_plate"],
        "confidence": result["confidence"],
        "processing_time_ms": processing_time_ms
    }

# Get Paginated & Filtered Violations List
@app.get("/violations")
def get_violations(
    search: str = Query(None),
    violation_type: str = Query(None),
    vehicle_type: str = Query(None),
    limit: int = 15,
    offset: int = 0
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM violations WHERE 1=1"
    params = []
    
    if search:
        query += " AND (license_plate LIKE ? OR location LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
        
    if violation_type:
        query += " AND violations LIKE ?"
        params.append(f"%{violation_type}%")
        
    if vehicle_type:
        query += " AND vehicle_type = ?"
        params.append(vehicle_type)
        
    # Count total for pagination
    count_query = f"SELECT COUNT(*) FROM ({query})"
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()[0]
    
    # Add ordering and pagination
    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    violations_list = []
    for r in rows:
        violations_list.append({
            "id": r["id"],
            "filename": r["filename"],
            "preprocessed_filename": r["preprocessed_filename"],
            "annotated_filename": r["annotated_filename"],
            "timestamp": r["timestamp"],
            "location": r["location"],
            "vehicle_type": r["vehicle_type"],
            "violations": [v.strip() for v in r["violations"].split(",")] if r["violations"] else [],
            "license_plate": r["license_plate"],
            "confidence": r["confidence"],
            "processing_time_ms": r["processing_time_ms"]
        })
        
    conn.close()
    
    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "data": violations_list
    }

# General statistics dashboard card info
@app.get("/statistics")
def get_statistics():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total count
    cursor.execute("SELECT COUNT(*) FROM violations")
    total = cursor.fetchone()[0]
    
    # Active violations count (non-empty strings)
    cursor.execute("SELECT COUNT(*) FROM violations WHERE violations != '' AND violations IS NOT NULL")
    infractions = cursor.fetchone()[0]
    
    # Avg processing speed
    cursor.execute("SELECT AVG(processing_time_ms) FROM violations")
    avg_speed = cursor.fetchone()[0] or 0.0
    
    # Today count
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) FROM violations WHERE timestamp LIKE ?", (f"{today_str}%",))
    today_count = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "total_records": total,
        "total_violations": infractions,
        "compliance_rate_percent": round(((total - infractions) / total * 100) if total > 0 else 100, 1),
        "average_processing_time_ms": round(avg_speed, 1),
        "today_records": today_count
    }

# Analytics visual graphs endpoints
@app.get("/analytics")
def get_analytics():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Timeline trend: count of violations by day
    cursor.execute("""
        SELECT date(timestamp) as day, 
               COUNT(*) as total_count,
               SUM(CASE WHEN violations != '' AND violations IS NOT NULL THEN 1 ELSE 0 END) as violation_count
        FROM violations 
        GROUP BY day 
        ORDER BY day ASC 
        LIMIT 30
    """)
    timeline_rows = cursor.fetchall()
    timeline = []
    for r in timeline_rows:
        timeline.append({
            "date": r["day"],
            "total": r["total_count"],
            "violations": r["violation_count"]
        })
        
    # 2. Violation distribution breakdown
    cursor.execute("SELECT violations FROM violations WHERE violations != '' AND violations IS NOT NULL")
    violation_rows = cursor.fetchall()
    violation_counts = {}
    for r in violation_rows:
        parts = [p.strip() for p in r["violations"].split(",") if p.strip()]
        for p in parts:
            violation_counts[p] = violation_counts.get(p, 0) + 1
            
    violation_breakdown = [{"type": k, "count": v} for k, v in violation_counts.items()]
    
    # 3. Vehicle categories distribution
    cursor.execute("SELECT vehicle_type, COUNT(*) as count FROM violations GROUP BY vehicle_type")
    vehicle_rows = cursor.fetchall()
    vehicle_breakdown = []
    for r in vehicle_rows:
        vehicle_breakdown.append({
            "category": r["vehicle_type"],
            "count": r["count"]
        })
        
    # 4. Performance evaluation (mAP, Precision, Recall summary)
    # Return mock target stats representing the overall validation report
    model_stats = {
        "mAP50": 0.84,
        "mAP50_95": 0.58,
        "precision": 0.89,
        "recall": 0.81,
        "f1_score": 0.85,
        "confidence_distribution": [
            {"range": "70-75%", "count": 6},
            {"range": "75-80%", "count": 12},
            {"range": "80-85%", "count": 18},
            {"range": "85-90%", "count": 10},
            {"range": "90-95%", "count": 8},
            {"range": "95-100%", "count": 6}
        ]
    }
    
    conn.close()
    
    return {
        "timeline": timeline,
        "violations": violation_breakdown,
        "vehicles": vehicle_breakdown,
        "model_performance": model_stats
    }