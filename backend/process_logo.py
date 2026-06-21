from PIL import Image
import numpy as np

# Load the cropped logo
img = Image.open("/Users/keyamittal/Desktop/visioncop-ai/frontend/public/logo_cropped.png").convert("RGBA")
data = np.array(img)
h, w, c = data.shape

# Make a copy for processing
new_data = data.copy()

# The vertical boundary for the traffic light is row 94
vertical_split = 94

# The horizontal boundary for the text "VisionCop" in the top section
top_horizontal_split = 170

# The horizontal boundary for the text "Ai" in the bottom section (to the right of the traffic light)
bottom_horizontal_split = 229

for y in range(h):
    for x in range(w):
        r, g, b, a = data[y, x]
        
        # Check if background (white/near-white)
        if r > 240 and g > 240 and b > 240:
            new_data[y, x] = [0, 0, 0, 0]  # Transparent
        else:
            # Check if we are in the top section (VisionCop text area)
            if y < vertical_split:
                if x >= top_horizontal_split:
                    # Convert text pixels to white with original intensity / anti-aliasing
                    gray_val = int(0.299 * r + 0.587 * g + 0.114 * b)
                    alpha = 255 - gray_val
                    if alpha > 15:
                        new_data[y, x] = [255, 255, 255, alpha]
                    else:
                        new_data[y, x] = [0, 0, 0, 0]
                else:
                    # Capybara top area: keep original, make white background transparent
                    if r > 230 and g > 230 and b > 230:
                        new_data[y, x] = [0, 0, 0, 0]
            else:
                # We are in the bottom section (Capybara, traffic light, and "Ai" text area)
                if x >= bottom_horizontal_split:
                    # Convert "Ai" text pixels to white
                    gray_val = int(0.299 * r + 0.587 * g + 0.114 * b)
                    alpha = 255 - gray_val
                    if alpha > 15:
                        new_data[y, x] = [255, 255, 255, alpha]
                    else:
                        new_data[y, x] = [0, 0, 0, 0]
                else:
                    # Capybara & Traffic light area: keep original, make white background transparent
                    if r > 230 and g > 230 and b > 230:
                        new_data[y, x] = [0, 0, 0, 0]

# Save the final transparent logo
final_img = Image.fromarray(new_data)
final_img.save("/Users/keyamittal/Desktop/visioncop-ai/frontend/public/logo_transparent.png")
print("Saved transparent logo with correct white text (including V) and original traffic light colors.")
