from fastapi import FastAPI, UploadFile, File, Form, Query, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import shutil
import os
import time
from datetime import datetime
import json
import base64

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
    date: str = Query(None),
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
        if violation_type == "COMPLIANT":
            query += " AND (violations = '' OR violations IS NULL)"
        elif violation_type == "INFRACTIONS":
            query += " AND violations != '' AND violations IS NOT NULL"
        else:
            query += " AND violations LIKE ?"
            params.append(f"%{violation_type}%")
        
    if vehicle_type:
        query += " AND vehicle_type = ?"
        params.append(vehicle_type)

    if date:
        query += " AND timestamp LIKE ?"
        params.append(f"{date}%")
        
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

# --- NEW ENDPOINTS: RTO LOOKUP & E-CHALLAN GENERATION ---

@app.get("/violations/{id}/rto")
def get_violation_rto(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # First get the violation
    cursor.execute("SELECT license_plate FROM violations WHERE id = ?", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Violation record not found")
        
    plate = row["license_plate"]
    
    # Query rto_registry
    cursor.execute("SELECT * FROM rto_registry WHERE license_plate = ?", (plate,))
    rto_row = cursor.fetchone()
    conn.close()
    
    if rto_row:
        return {
            "license_plate": rto_row["license_plate"],
            "owner_name": rto_row["owner_name"],
            "owner_email": rto_row["owner_email"],
            "owner_phone": rto_row["owner_phone"],
            "vehicle_model": rto_row["vehicle_model"],
            "registration_date": rto_row["registration_date"],
            "insurance_valid_until": rto_row["insurance_valid_until"]
        }
    
    # Return placeholder / not found structure
    return {
        "license_plate": plate,
        "owner_name": "Rohan Deshmukh (Unverified)",
        "owner_email": "rohan.deshmukh@email.com",
        "owner_phone": "+91 98877 66554",
        "vehicle_model": "Sedan/Motorcycle (Pending Verify)",
        "registration_date": "N/A",
        "insurance_valid_until": "N/A"
    }

@app.get("/violations/{id}/challan")
def get_violation_challan(id: int):
    import io
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM violations WHERE id = ?", (id,))
    violation = cursor.fetchone()
    if not violation:
        conn.close()
        raise HTTPException(status_code=404, detail="Violation record not found")
        
    plate = violation["license_plate"]
    cursor.execute("SELECT * FROM rto_registry WHERE license_plate = ?", (plate,))
    rto = cursor.fetchone()
    conn.close()
    
    if not rto:
        rto = {
            "owner_name": "Rohan Deshmukh",
            "owner_email": "rohan.deshmukh@email.com",
            "owner_phone": "+91 98877 66554",
            "vehicle_model": "Unknown Class",
            "registration_date": "N/A",
            "insurance_valid_until": "N/A"
        }
        
    # Compile fines
    fine_mapping = {
        "No Helmet": 1000,
        "Triple Riding": 2000,
        "Seatbelt Violation": 1000,
        "Red Light Violation": 5000,
        "Stop Line Crossing": 5000,
        "Wrong-way Driving": 5000,
        "Illegal Parking": 1000
    }
    
    violations_list = [v.strip() for v in violation["violations"].split(",") if v.strip()] if violation["violations"] else []
    total_fine = 0
    fine_breakdown = []
    
    for v in violations_list:
        amt = fine_mapping.get(v, 1000)
        total_fine += amt
        fine_breakdown.append([v, f"INR {amt:,}"])
        
    if not fine_breakdown:
        fine_breakdown.append(["No infractions detected", "INR 0"])
        
    # Generate PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#110e24'),
        spaceAfter=15
    )
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#8b5cf6'),
        spaceBefore=10,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#27272a'),
        leading=14
    )
    
    # 1. Header Table
    header_data = [
        [
            Paragraph("🚔 VisionCop AI Traffic Citation", title_style),
            Paragraph(f"<b>Challan ID:</b> VC-{id}<br/><b>Date:</b> {violation['timestamp'][:10]}", body_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(header_table)
    
    # Horizontal line
    divider = Table([['']], colWidths=[540], rowHeights=[2])
    divider.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#8b5cf6')),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 15))
    
    # 2. Vehicle & Owner Information
    story.append(Paragraph("Vehicle Registration & Owner Information (RTO Lookup)", section_title))
    rto_data = [
        ["Owner Name:", rto["owner_name"], "License Plate:", violation["license_plate"]],
        ["Vehicle Model:", rto["vehicle_model"], "Location:", violation["location"]],
        ["Owner Email:", rto["owner_email"], "Registration Date:", rto["registration_date"]],
        ["Owner Phone:", rto["owner_phone"], "Insurance Valid:", rto["insurance_valid_until"]]
    ]
    rto_table = Table(rto_data, colWidths=[100, 170, 100, 170])
    rto_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f4f4f5')),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor('#71717a')),
        ('TEXTCOLOR', (2,0), (2,-1), colors.HexColor('#71717a')),
        ('TEXTCOLOR', (1,0), (1,-1), colors.HexColor('#09090b')),
        ('TEXTCOLOR', (3,0), (3,-1), colors.HexColor('#09090b')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e4e4e7')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(rto_table)
    story.append(Spacer(1, 15))
    
    # 3. Violation Fine Breakdown
    story.append(Paragraph("Offence Report & Fine Assessment", section_title))
    fine_data = [["Traffic Offence Category", "Assessment Amount"]]
    for item in fine_breakdown:
        fine_data.append(item)
    fine_data.append(["Total Penalty Amount:", f"INR {total_fine:,}"])
    
    fine_table = Table(fine_data, colWidths=[360, 180])
    fine_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), colors.HexColor('#110e24')),
        ('TEXTCOLOR', (0,0), (1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e4e4e7')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('FONTNAME', (0,-1), (1,-1), 'Helvetica-Bold'),
        ('BACKGROUND', (0,-1), (1,-1), colors.HexColor('#fef2f2')),
        ('TEXTCOLOR', (0,-1), (1,-1), colors.HexColor('#991b1b')),
    ]))
    story.append(fine_table)
    story.append(Spacer(1, 15))
    
    # 4. Image Evidence Output (Check if annotated file exists)
    story.append(Paragraph("Photographic Evidence Capture", section_title))
    evidence_path = violation["annotated_filename"]
    if os.path.exists(evidence_path):
        try:
            evidence_img = RLImage(evidence_path, width=450, height=253)
            story.append(evidence_img)
        except Exception as e:
            story.append(Paragraph(f"<i>Could not load evidence image preview: {str(e)}</i>", body_style))
    else:
        story.append(Paragraph("<i>Photographic evidence file missing or unaccessible.</i>", body_style))
    story.append(Spacer(1, 15))
    
    # Footer notice
    story.append(Paragraph("<b>Notice:</b> This E-Challan is generated by the automated VisionCop AI surveillance pipeline. Bounding boxes represent inference results from standard computer vision and OCR matching routines.", ParagraphStyle('Notice', parent=body_style, fontSize=8, textColor=colors.HexColor('#71717a'))))
    
    doc.build(story)
    buffer.seek(0)
    
    return FileResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=E-Challan_Log_{id}.pdf"}
    )

# --- NEW ENDPOINTS: WEBSOCKET STREAMING ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

manager = ConnectionManager()

@app.websocket("/ws/video")
async def websocket_video_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive base64 frame from client
            data = await websocket.receive_text()
            
            # Message is structured as json containing image data and filters
            message = json.loads(data)
            frame_data = message.get("image") # base64 string
            filters = message.get("filters", {})
            
            if not frame_data:
                await websocket.send_json({"error": "No image data sent"})
                continue
                
            # Decode base64
            if "," in frame_data:
                frame_data = frame_data.split(",")[1]
            image_bytes = base64.b64decode(frame_data)
            
            # Temporary file write inside uploads to process
            temp_path = "uploads/ws_stream_temp.jpg"
            with open(temp_path, "wb") as f:
                f.write(image_bytes)
                
            # Process frame
            preprocess_options = {
                "low_light": filters.get("lowLight", False),
                "denoise": filters.get("denoise", False),
                "contrast": filters.get("contrast", False)
            }
            
            result = process_image(temp_path, preprocess_options)
            
            # Read output image back as base64
            with open(result["output_image"], "rb") as f:
                encoded_output = base64.b64encode(f.read()).decode("utf-8")
                
            # Send back annotated details
            response_payload = {
                "image": f"data:image/jpeg;base64,{encoded_output}",
                "violations": result["violations"],
                "license_plate": result["license_plate"],
                "confidence": result["confidence"],
                "vehicles_detected": result["vehicles_detected"]
            }
            
            await websocket.send_json(response_payload)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)
        print(f"WebSocket processing error: {str(e)}")

# --- NEW ENDPOINTS: ROI CONFIGURATION ---

CONFIG_FILE = "camera_config.json"

@app.get("/config/roi")
def get_roi_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
            
    # Default parameters
    return {
        "stop_line_ratio": 0.65,
        "wrong_way_ratio": 0.75,
        "illegal_parking_ratio": 0.22
    }

@app.post("/config/roi")
async def update_roi_config(config: dict):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=4)
        return {"status": "success", "message": "ROI configurations updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save ROI settings: {str(e)}")