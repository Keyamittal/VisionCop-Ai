from ultralytics import YOLO

model = YOLO("yolov8x.pt")

results = model("test.jpg")

results[0].show()