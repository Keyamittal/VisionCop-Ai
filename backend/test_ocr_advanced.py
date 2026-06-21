import cv2
import numpy as np
import easyocr
import re
from ultralytics import YOLO

# Load YOLO Model
model = YOLO("yolov8x.pt")
reader = easyocr.Reader(['en'], gpu=False)

image_path = "uploads/new-delhi-indiajune-12-2025an-260nw-2643954003.jpg.webp"
image = cv2.imread(image_path)
if image is None:
    print("Could not load image")
    exit()

height, width, _ = image.shape
results = model(image, verbose=False)
boxes = results[0].boxes

motorcycles = []
for box in boxes:
    cls = int(box.cls[0])
    conf = float(box.conf[0])
    if conf < 0.45:
        continue
    x1, y1, x2, y2 = map(int, box.xyxy[0])
    if cls == 3: # motorcycle
        motorcycles.append((x1, y1, x2, y2, conf))

print(f"Detected {len(motorcycles)} motorcycles")

for idx, bike in enumerate(motorcycles):
    bx1, by1, bx2, by2, bconf = bike
    # Let's crop a slightly wider region for the lower vehicle (from 50% to 100% of height)
    # and 5% padding on left/right to ensure the plate is captured
    pad_x = int((bx2 - bx1) * 0.05)
    plate_roi_y1 = by1 + int((by2 - by1) * 0.50)
    
    rx1 = max(0, bx1 - pad_x)
    rx2 = min(width, bx2 + pad_x)
    ry1 = plate_roi_y1
    ry2 = by2
    
    plate_roi = image[ry1:ry2, rx1:rx2]
    
    if plate_roi.size > 0:
        # Upscale by 6x with cubic interpolation
        h_roi, w_roi = plate_roi.shape[:2]
        upscaled = cv2.resize(plate_roi, (w_roi * 6, h_roi * 6), interpolation=cv2.INTER_CUBIC)
        
        # Preprocessing versions
        gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)
        filtered = cv2.bilateralFilter(gray, 11, 85, 85)
        
        # Adaptive Threshold (for text detection on noisy background)
        thresh = cv2.adaptiveThreshold(filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        
        # Check raw upscaled and thresholded versions
        print(f"\n--- Motorcycle {idx} (Original size: {w_roi}x{h_roi}) ---")
        
        results_raw = reader.readtext(upscaled)
        print("  Raw Upscaled OCR:")
        for res in results_raw:
            print(f"    Text: {res[1]} (Conf: {res[2]:.2f})")
            
        results_thresh = reader.readtext(thresh)
        print("  Thresholded OCR:")
        for res in results_thresh:
            print(f"    Text: {res[1]} (Conf: {res[2]:.2f})")
