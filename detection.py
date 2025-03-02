import cv2
import numpy as np
from collections import defaultdict
from ultralytics import YOLO
import easyocr
import re
import sys
import json

# Load the pre-trained YOLO model
model = YOLO(r'D:\FYP data\Yolov10 - 30-01-25\data - Copy\runs\runs\detect\train\weights\best.pt')

# Initialize EasyOCR
reader = easyocr.Reader(['en'])  # 'en' for English

# Load class names
class_names = ['Number Plate', 'Honda Civic X', 'Suzuki Mehran', 'Suzuki Bolan', 'Suzuki Cultus']

# Assign distinct colors to each class (BGR format)
class_colors = {
    'Number Plate': (0, 0, 255),      # Red
    'Honda Civic X': (255, 0, 0),     # Blue
    'Suzuki Mehran': (0, 255, 255),   # Yellow
    'Suzuki Bolan': (128, 0, 128),    # Purple
    'Suzuki Cultus': (0, 255, 0)      # Green
}

# Dictionary to store counts of each car ID, label, and direction counts
car_detections = defaultdict(lambda: {
    'counts': defaultdict(int),
    'last_positions': [],
    'direction_counts': {'left': 0, 'right': 0, 'possible_left': 0, 'possible_right': 0},
    'number_plates': defaultdict(lambda: {'total_confidence': 0, 'count': 0}),  # Track confidence and duration
    'colors': []  # Store all detected colors
})

# Define color ranges in HSV (Hue, Saturation, Value)
color_ranges = {
    'red': ([0, 100, 100], [10, 255, 255]),
    'green': ([35, 100, 100], [85, 255, 255]),
    'blue': ([100, 100, 100], [130, 255, 255]),
    'yellow': ([20, 100, 100], [30, 255, 255]),
    'white': ([0, 0, 200], [180, 50, 255]),
    'black': ([0, 0, 0], [180, 255, 30])
}

# Function to detect the dominant color in a region
def detect_dominant_color(region):
    if region.size == 0:
        return 'unknown'
    
    hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
    color_counts = {color: 0 for color in color_ranges}

    for color, (lower, upper) in color_ranges.items():
        mask = cv2.inRange(hsv, np.array(lower, np.uint8), np.array(upper, np.uint8))
        color_counts[color] = cv2.countNonZero(mask)

    total_pixels = region.size // 3
    black_percent = (color_counts['black'] / total_pixels) * 100
    
    if black_percent > 50:
        return 'black'
    del color_counts['black']
    return max(color_counts, key=color_counts.get)

# Function to calculate the center of a bounding box
def get_center(x1, y1, x2, y2):
    return ((x1 + x2) // 2, (y1 + y2) // 2)

# Function to calculate the distance between two points
def get_distance(p1, p2):
    return np.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

# Function to clean plate text and enforce the format ABC-123
def clean_plate_text(plate_text):
    # Remove invalid characters (keep only alphanumeric, spaces, hyphens, underscores, and periods)
    cleaned_text = re.sub(r'[^A-Za-z0-9\s\-_.]', '', plate_text)
    # Normalize spaces (replace multiple spaces with a single space)
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
    # Convert to uppercase
    cleaned_text = cleaned_text.upper()
    
    # Enforce the format ABC-123
    # Extract the first 3 letters and the last 3 digits
    letters = re.sub(r'[^A-Z]', '', cleaned_text)[:3]  # Keep only letters and take the first 3
    digits = re.sub(r'[^0-9]', '', cleaned_text)[-3:]  # Keep only digits and take the last 3
    
    # Combine letters and digits with a hyphen
    formatted_plate = f"{letters}-{digits}"
    
    return formatted_plate

# Regex pattern for complete plate numbers (e.g., AFK-927)
complete_plate_pattern = re.compile(r'^[A-Z]{3}-\d{3}$')

# Regex pattern for partial plate numbers (e.g., AFK)
partial_plate_pattern = re.compile(r'^[A-Z]{2,4}$')

# Function to get the best plate based on regex, frame count, and confidence
def get_best_plate(plates, confidence_threshold=0.3):
    # Preprocess plates and separate complete and partial matches
    complete_matches = {}
    partial_matches = {}

    for plate, stats in plates.items():
        # Clean the plate text
        cleaned_plate = clean_plate_text(plate)

        # Check if the cleaned plate matches the complete pattern
        if complete_plate_pattern.match(cleaned_plate):
            if (stats['total_confidence'] / stats['count']) >= confidence_threshold:
                complete_matches[cleaned_plate] = stats
        elif partial_plate_pattern.match(cleaned_plate):
            if (stats['total_confidence'] / stats['count']) >= confidence_threshold:
                partial_matches[cleaned_plate] = stats

    # Prioritize complete matches
    if complete_matches:
        sorted_plates = sorted(complete_matches.items(), 
                              key=lambda x: (-x[1]['count'], -x[1]['total_confidence']))
    elif partial_matches:
        # Fallback to partial matches
        sorted_plates = sorted(partial_matches.items(), 
                              key=lambda x: (-x[1]['count'], -x[1]['total_confidence']))
    else:
        # Fallback to all plates if no complete or partial matches are found
        sorted_plates = sorted(plates.items(), 
                              key=lambda x: (-x[1]['count'], -x[1]['total_confidence']))
    
    if not sorted_plates:
        return None, None
    
    # If multiple plates have the same frame count, choose the one that appears last
    best_plate, best_stats = sorted_plates[0]
    for plate, stats in sorted_plates:
        if stats['count'] == best_stats['count'] and stats['total_confidence'] > best_stats['total_confidence']:
            best_plate, best_stats = plate, stats
    
    return best_plate, best_stats

def process_video(video_path):
    # Open the video file
    cap = cv2.VideoCapture(video_path)
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Define movement thresholds
    left_exit_threshold = frame_width * 0.2  # 20% of frame width from the left
    right_exit_threshold = frame_width * 0.8  # 80% of frame width from the right

    # Loop through the video frames
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Perform object detection and tracking on the frame
        results = model.track(frame, conf=0.3, persist=True)

        # First pass: Collect all data without modifying the frame
        temp_data = []
        car_boxes = {}  # Store car model bounding boxes and IDs
        plate_boxes = []  # Store number plate bounding boxes and IDs

        for result in results:
            for obj in result.boxes:
                car_id = int(obj.id.item()) if obj.id is not None else None
                car_label_idx = int(obj.cls.item())
                car_label = class_names[car_label_idx]
                x1, y1, x2, y2 = map(int, obj.xyxy[0])

                # Store data for later processing
                temp_data.append((car_id, car_label, x1, y1, x2, y2))

                # Separate car models and number plates
                if car_label != 'Number Plate':
                    car_boxes[car_id] = (x1, y1, x2, y2)
                else:
                    plate_boxes.append((car_id, x1, y1, x2, y2))

                # Capture car color BEFORE drawing anything
                if car_label != 'Number Plate':
                    car_region = frame[y1:y2, x1:x2].copy()  # Use copy of original frame
                    dominant_color = detect_dominant_color(car_region)
                    car_detections[car_id]['colors'].append(dominant_color)

                # Capture number plate text
                if car_label == 'Number Plate':
                    plate_region = frame[y1:y2, x1:x2].copy()
                    ocr_results = reader.readtext(plate_region)
                    if ocr_results:
                        text, conf = ocr_results[0][1], ocr_results[0][2]
                        # Update plate tracking with confidence and count
                        car_detections[car_id]['number_plates'][text]['total_confidence'] += conf
                        car_detections[car_id]['number_plates'][text]['count'] += 1

        # Associate number plates with the nearest car model
        for plate_id, plate_x1, plate_y1, plate_x2, plate_y2 in plate_boxes:
            plate_center = get_center(plate_x1, plate_y1, plate_x2, plate_y2)
            min_distance = float('inf')
            best_car_id = None

            # Find the nearest car model
            for car_id, (car_x1, car_y1, car_x2, car_y2) in car_boxes.items():
                car_center = get_center(car_x1, car_y1, car_x2, car_y2)
                distance = get_distance(plate_center, car_center)
                if distance < min_distance:
                    min_distance = distance
                    best_car_id = car_id

            # If a nearby car model is found, associate the number plate with it
            if best_car_id is not None:
                # Transfer number plate data to the car model's ID
                if car_detections[plate_id]['number_plates']:
                    for plate, stats in car_detections[plate_id]['number_plates'].items():
                        car_detections[best_car_id]['number_plates'][plate]['total_confidence'] += stats['total_confidence']
                        car_detections[best_car_id]['number_plates'][plate]['count'] += stats['count']
                    # Clear the number plate data from the original ID
                    car_detections[plate_id]['number_plates'].clear()

        # Second pass: Draw all bounding boxes and text
        for car_id, car_label, x1, y1, x2, y2 in temp_data:
            bbox_color = class_colors[car_label]
            
            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), bbox_color, 2)

            # Draw class label
            label = f"ID: {car_id}, {car_label}"
            text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
            cv2.rectangle(frame, (x1, y1 - text_size[1] - 10), 
                        (x1 + text_size[0], y1 - 10), bbox_color, -1)
            cv2.putText(frame, label, (x1, y1 - 10), 
                      cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

            # Draw number plate text
            if car_label != 'Number Plate' and car_detections[car_id]['number_plates']:
                # Get the best plate using regex, frame count, and tie-breaker logic
                plates = car_detections[car_id]['number_plates']
                best_plate, best_stats = get_best_plate(plates, confidence_threshold=0.3)
                
                if best_plate:
                    # Prepare display text with count and confidence
                    plate_text = f"Plate: {best_plate}"
                    text_size = cv2.getTextSize(plate_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
                    
                    # Draw background and text
                    cv2.rectangle(frame, (x1, y2 + 10), 
                                (x1 + text_size[0] + 10, y2 + text_size[1] + 30), (0, 0, 0), -1)
                    cv2.putText(frame, plate_text, (x1 + 5, y2 + text_size[1] + 20), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            # Draw color text
            if car_label != 'Number Plate' and car_detections[car_id]['colors']:
                color_counts = {}
                for color in car_detections[car_id]['colors']:
                    color_counts[color] = color_counts.get(color, 0) + 1
                dominant_color = max(color_counts, key=color_counts.get)
                
                # Centered black background
                color_text = f"Color: {dominant_color}"
                text_size = cv2.getTextSize(color_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
                box_x = x1 + (x2 - x1 - text_size[0]) // 2 - 5
                box_y = y2 + 20
                cv2.rectangle(frame, (box_x, box_y), 
                            (box_x + text_size[0] + 10, box_y + text_size[1] + 10), (0, 0, 0), -1)
                cv2.putText(frame, color_text, (box_x + 5, box_y + text_size[1] + 5),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            # Increment the count for this car ID and label, only if ID exists
            if car_id is not None:
                car_detections[car_id]['counts'][car_label_idx] += 1
                car_detections[car_id]['last_positions'].append((x1 + x2) / 2)  # Track x-center

                # Limit to the last 10 positions to analyze trends
                if len(car_detections[car_id]['last_positions']) > 10:
                    car_detections[car_id]['last_positions'].pop(0)

                # Check if the car is exiting the frame based on defined thresholds
                if len(car_detections[car_id]['last_positions']) > 1:
                    last_pos = car_detections[car_id]['last_positions'][-1]
                    second_last_pos = car_detections[car_id]['last_positions'][-2]

                    # Determine direction based on exit thresholds
                    if last_pos < left_exit_threshold and second_last_pos >= left_exit_threshold:
                        car_detections[car_id]['direction_counts']['left'] += 1
                    elif last_pos > right_exit_threshold and second_last_pos <= right_exit_threshold:
                        car_detections[car_id]['direction_counts']['right'] += 1
                    else:
                        # Check for trends if direction is still undetermined
                        if len(car_detections[car_id]['last_positions']) >= 10:
                            x_values = car_detections[car_id]['last_positions'][-10:]

                            # Calculate trend: increasing or decreasing
                            if all(x_values[i] < x_values[i + 1] for i in range(len(x_values) - 1)):
                                car_detections[car_id]['direction_counts']['possible_right'] += 1
                            elif all(x_values[i] > x_values[i + 1] for i in range(len(x_values) - 1)):
                                car_detections[car_id]['direction_counts']['possible_left'] += 1

        # Display the frame with overlaid text
        # cv2.imshow("Car Detection, Number Plate Recognition, and Color Detection", frame)

        # Exit if 'q' is pressed
        # if cv2.waitKey(1) & 0xFF == ord('q'):
        #     break

    # Release resources
    cap.release()
    # cv2.destroyAllWindows()

    # Final analysis of car directions and colors
    results = []
    for car_id, data in car_detections.items():
        # Skip if 'counts' is empty
        if not data['counts']:
            continue
        
        # Get the most frequent class index
        main_class_idx = max(data['counts'], key=data['counts'].get)
        
        # Skip number plate-only entries
        if class_names[main_class_idx] == 'Number Plate':
            continue
        
        # Get all detected colors
        color_counts = {}
        for color in data['colors']:
            color_counts[color] = color_counts.get(color, 0) + 1
        dominant_color = max(color_counts, key=color_counts.get) if color_counts else 'Unknown'
        
        # Get the best plate using regex, frame count, and tie-breaker logic
        plates = data['number_plates']
        best_plate, best_stats = get_best_plate(plates, confidence_threshold=0.3)
        
        # Determine direction
        right = data['direction_counts']['left'] + data['direction_counts']['possible_left']
        left = data['direction_counts']['right'] + data['direction_counts']['possible_right']
        direction = 'left' if left > right else 'right' if right > left else 'unknown'
        
        # Append the result
        results.append({
            'car_id': car_id,
            'car_label': class_names[main_class_idx],
            'direction': direction,
            'color': dominant_color,
            'number_plate': best_plate if best_plate else "None"
        })

    return results

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python detection.py <video_path>")
        sys.exit(1)

    video_path = sys.argv[1]
    results = process_video(video_path)
    print("===JSON_START===")
    print(json.dumps(results))
    print("===JSON_END===")