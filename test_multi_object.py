import cv2
from ultralytics import YOLO


VIDEO = "samples/test_border_feed.mp4"

TARGETS = {
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "bus",
    "truck",
    "train",
}


model = YOLO("yolo11n.pt")

cap = cv2.VideoCapture(VIDEO)

if not cap.isOpened():
    raise RuntimeError(f"Cannot open {VIDEO}")

frame_number = 0
best_count = 0
best_objects = []

while frame_number < 300:
    ok, frame = cap.read()

    if not ok:
        break

    frame_number += 1

    result = model.predict(
        frame,
        conf=0.10,
        verbose=False,
    )[0]

    objects = []

    if result.boxes is not None:
        for box in result.boxes:
            class_id = int(box.cls[0])
            name = result.names[class_id]
            confidence = float(box.conf[0])

            if name in TARGETS:
                objects.append(
                    {
                        "class": name,
                        "confidence": round(confidence, 3),
                        "bbox": [
                            int(v)
                            for v in box.xyxy[0].tolist()
                        ],
                    }
                )

    if len(objects) > best_count:
        best_count = len(objects)
        best_objects = objects

    if len(objects) > 0:
        print(
            f"Frame {frame_number}: "
            f"{len(objects)} objects"
        )
        for obj in objects:
            print(" ", obj)

cap.release()

print("\n--- MULTI OBJECT TEST ---")
print("Frames scanned:", frame_number)
print("Best object count:", best_count)
print("Best objects:", best_objects)