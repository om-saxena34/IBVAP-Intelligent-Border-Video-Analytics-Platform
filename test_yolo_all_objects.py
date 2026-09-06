import cv2
from ultralytics import YOLO

VIDEO = "samples/test_border_feed.mp4"
MODEL = "yolo11n.pt"

print("=== YOLO MULTI-OBJECT DIAGNOSTIC ===")

model = YOLO(MODEL)

cap = cv2.VideoCapture(VIDEO)

if not cap.isOpened():
    raise RuntimeError(f"Cannot open video: {VIDEO}")

best_count = 0
best_objects = []

frame_number = 0

while True:
    ok, frame = cap.read()

    if not ok:
        break

    frame_number += 1

    result = model.predict(
        source=frame,
        conf=0.01,
        iou=0.45,
        imgsz=640,
        verbose=False,
    )[0]

    objects = []

    if result.boxes is not None:
        for box in result.boxes:
            class_id = int(box.cls[0])
            class_name = result.names[class_id]
            confidence = float(box.conf[0])

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            objects.append({
                "class": class_name,
                "confidence": round(confidence, 3),
                "bbox": [
                    int(x1),
                    int(y1),
                    int(x2),
                    int(y2),
                ],
            })

    if len(objects) > best_count:
        best_count = len(objects)
        best_objects = objects

        print()
        print(f"Frame {frame_number}")
        print("Objects:", best_count)

        for obj in objects:
            print(
                f"  {obj['class']:15}"
                f" confidence={obj['confidence']}"
                f" bbox={obj['bbox']}"
            )

cap.release()

print()
print("=== RESULT ===")
print("Frames scanned:", frame_number)
print("Best object count:", best_count)
print("Best objects:")

for obj in best_objects:
    print(obj)

print("=== DONE ===")






