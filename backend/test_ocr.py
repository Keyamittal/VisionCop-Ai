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

detected_vehicles = []
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

state_codes = {"AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA", "GJ", "HR", "HP", "JK", "JH", "KA", "KL", "LA", "LD", "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ", "SK", "TN", "TS", "TR", "UA", "UK", "UP", "WB"}

for idx, bike in enumerate(motorcycles):
    bx1, by1, bx2, by2, bconf = bike
    plate_roi_y1 = by1 + int((by2 - by1) * 0.55)
    plate_roi = image[plate_roi_y1:by2, bx1:bx2]
    
    if plate_roi.size > 0:
        cv2.imwrite(f"uploads/debug_roi_{idx}.jpg", plate_roi)
        ocr_results = reader.readtext(plate_roi)
        print(f"Motorcycle {idx} raw OCR detections:")
        for res in ocr_results:
            box_pts, text, conf = res
            clean_text = re.sub(r'[^A-Z0-9]', '', text.upper())
            print(f"  Text: {text} -> Cleaned: {clean_text} (Conf: {conf})")
