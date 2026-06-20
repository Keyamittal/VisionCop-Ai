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

boxes = results[0].boxes

PERSON_CLASS = 0
MOTORCYCLE_CLASS = 3

persons = []
motorcycles = []

# Collect detections
for box in boxes:

    cls = int(box.cls[0])
    conf = float(box.conf[0])

    if conf < 0.5:
        continue

    x1, y1, x2, y2 = map(int, box.xyxy[0])

    if cls == PERSON_CLASS:
        persons.append((x1, y1, x2, y2))

    elif cls == MOTORCYCLE_CLASS:
        motorcycles.append((x1, y1, x2, y2))

# Match riders to motorcycles
for bike in motorcycles:

    bx1, by1, bx2, by2 = bike

    for person in persons:

        px1, py1, px2, py2 = person

        # Person center
        center_x = (px1 + px2) // 2
        center_y = (py1 + py2) // 2

        # Check if rider belongs to motorcycle
        if (
            bx1 < center_x < bx2 and
            by1 - 100 < center_y < by2 + 50
        ):

            # Head region
            head_y2 = py1 + (py2 - py1) // 3

            head_region = image[py1:head_y2, px1:px2]

            # Skip empty regions
            if head_region.size == 0:
                continue

            # Convert to grayscale
            gray = cv2.cvtColor(head_region, cv2.COLOR_BGR2GRAY)

            brightness = gray.mean()

            # Improved helmet logic
            label = "HELMET"
            color = (0, 255, 0)

            # Very bright heads likely no helmet
            if brightness > 170:

                label = "NO HELMET"
                color = (0, 0, 255)

            # Draw rider box
            cv2.rectangle(image, (px1, py1), (px2, py2), color, 2)

            cv2.putText(
                image,
                label,
                (px1, py1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                color,
                2
            )

# Save output
output_path = "helmet_output.jpg"

cv2.imwrite(output_path, image)

print(f"Saved as {output_path}")