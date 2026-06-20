import cv2
import easyocr

# Load image
image_path = "bike_test.jpg"

image = cv2.imread(image_path)

# Convert to grayscale
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

# Initialize OCR reader
reader = easyocr.Reader(['en'])

# Run OCR
results = reader.readtext(gray)

# Draw detections
for result in results:

    bbox, text, confidence = result

    # Ignore weak text
    if confidence < 0.3:
        continue

    # Get box coordinates
    top_left = tuple(map(int, bbox[0]))
    bottom_right = tuple(map(int, bbox[2]))

    # Draw rectangle
    cv2.rectangle(image, top_left, bottom_right, (0, 255, 0), 2)

    # Put detected text
    cv2.putText(
        image,
        text,
        (top_left[0], top_left[1] - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (0, 255, 0),
        2
    )

    print(f"Detected Text: {text}")

# Save output
output_path = "ocr_output.jpg"

cv2.imwrite(output_path, image)

print(f"OCR output saved as {output_path}")