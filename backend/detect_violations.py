from ultralytics import YOLO
import cv2

# Load YOLO model
model = YOLO("yolov8n.pt")

# Load image
image_path = "bike_test.jpg"

# Run detection
results = model(image_path)

# Read image
image = cv2.imread(image_path)

# Get detections
boxes = results[0].boxes

persons = []
motorcycles = []

# COCO IDs
PERSON_CLASS = 0
MOTORCYCLE_CLASS = 3

# Collect detections
for box in boxes:

    cls = int(box.cls[0])
    conf = float(box.conf[0])

    # Ignore weak detections
    if conf < 0.4:
        continue

    x1, y1, x2, y2 = map(int, box.xyxy[0])

    if cls == PERSON_CLASS:
        persons.append((x1, y1, x2, y2))

    elif cls == MOTORCYCLE_CLASS:
        motorcycles.append((x1, y1, x2, y2))

# Process each motorcycle
for bike in motorcycles:

    bx1, by1, bx2, by2 = bike

    rider_count = 0

    # Draw bike box first
    cv2.rectangle(image, (bx1, by1), (bx2, by2), (0, 255, 0), 2)

    # Count riders close to bike
    for person in persons:

        px1, py1, px2, py2 = person

        # Person center
        center_x = (px1 + px2) // 2
        center_y = (py1 + py2) // 2

        # Check if person center lies near motorcycle
        if (
            bx1 < center_x < bx2 and
            by1 - 100 < center_y < by2 + 100
        ):

            rider_count += 1

    # Default label
    label = f"Riders: {rider_count}"
    color = (0, 255, 0)

    # Triple riding violation
    if rider_count > 2:

        label = "TRIPLE RIDING"
        color = (0, 0, 255)

    # Draw final box
    cv2.rectangle(image, (bx1, by1), (bx2, by2), color, 3)

    cv2.putText(
        image,
        label,
        (bx1, by1 - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        color,
        2
    )

# Save output
output_path = "output.jpg"

cv2.imwrite(output_path, image)

print(f"Saved as {output_path}")

