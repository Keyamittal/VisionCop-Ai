import cv2
import easyocr

reader = easyocr.Reader(['en'], gpu=False)
image_path = "uploads/new-delhi-indiajune-12-2025an-260nw-2643954003.jpg.webp"
image = cv2.imread(image_path)
if image is not None:
    h, w, _ = image.shape
    print(f"Original image dimensions: {w}x{h}")
    
    # Run OCR on the whole image
    results = reader.readtext(image)
    print("Whole image OCR detections:")
    for res in results:
        print(f"  Box: {res[0]} | Text: {res[1]} | Conf: {res[2]}")
else:
    print("Could not load image")
