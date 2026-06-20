from ultralytics import YOLO

model = YOLO("yolov8n.pt")

results = model("test.jpg")

results[0].show()