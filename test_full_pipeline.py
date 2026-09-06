from __future__ import annotations

import cv2

from backend.services.analytics_engine import AnalyticsEngine


VIDEO_PATH = "samples/test_border_feed.mp4"
OUTPUT_PATH = "ibvap_analytics_output.mp4"


def main() -> None:
    engine = AnalyticsEngine(
        model_path="yolo11n.pt",
        confidence_threshold=0.25,
        fence=((100, 300), (900, 300)),
        restricted_zone=[
            (500, 150),
            (850, 150),
            (850, 550),
            (500, 550),
        ],
        expected_direction=(1.0, 0.0),
        loitering_seconds=10.0,
    )

    capture = cv2.VideoCapture(VIDEO_PATH)

    if not capture.isOpened():
        raise RuntimeError(
            f"Could not open video: {VIDEO_PATH}"
        )

    fps = capture.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 25.0

    width = int(
        capture.get(cv2.CAP_PROP_FRAME_WIDTH)
    )
    height = int(
        capture.get(cv2.CAP_PROP_FRAME_HEIGHT)
    )

    writer = cv2.VideoWriter(
        OUTPUT_PATH,
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )

    if not writer.isOpened():
        capture.release()
        raise RuntimeError(
            f"Could not create: {OUTPUT_PATH}"
        )

    frame_number = 0
    total_detections = 0
    total_events = 0
    total_faces = 0
    total_plates = 0

    try:
        while True:
            success, frame = capture.read()

            if not success:
                break

            frame_number += 1

            result = engine.process_frame(
                frame,
                timestamp=frame_number / fps,
            )

            detections = result["detections"]
            faces = result["faces"]
            plates = result["plates"]
            events = result["events"]

            total_detections += len(detections)
            total_events += len(events)
            total_faces += len(faces)
            total_plates += len(plates)

            # Object / tracking boxes
            for detection in detections:
                bbox = detection["bbox"]

                x1 = bbox["x1"]
                y1 = bbox["y1"]
                x2 = bbox["x2"]
                y2 = bbox["y2"]

                label = detection["class"]

                if detection["track_id"] is not None:
                    label += (
                        f" ID:{detection['track_id']}"
                    )

                label += (
                    f" {detection['confidence']:.2f}"
                )

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2,
                )

                cv2.putText(
                    frame,
                    label,
                    (x1, max(20, y1 - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 0),
                    2,
                )

            # Face boxes
            for face in faces:
                bbox = face["bbox"]

                cv2.rectangle(
                    frame,
                    (bbox["x1"], bbox["y1"]),
                    (bbox["x2"], bbox["y2"]),
                    (255, 0, 0),
                    2,
                )

                cv2.putText(
                    frame,
                    "FACE",
                    (bbox["x1"], max(20, bbox["y1"] - 5)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 0, 0),
                    2,
                )

            # Restricted zone
            zone = [
                (500, 150),
                (850, 150),
                (850, 550),
                (500, 550),
            ]

            for i in range(len(zone)):
                cv2.line(
                    frame,
                    zone[i],
                    zone[(i + 1) % len(zone)],
                    (0, 0, 255),
                    2,
                )

            # Virtual fence
            cv2.line(
                frame,
                (100, 300),
                (900, 300),
                (255, 255, 0),
                2,
            )

            # Event indicator
            if events:
                cv2.putText(
                    frame,
                    f"ALERTS: {len(events)}",
                    (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 0, 255),
                    2,
                )

            writer.write(frame)

            # Limit initial validation to 300 frames.
            if frame_number >= 300:
                break

    finally:
        capture.release()
        writer.release()

    print("\n--- IBVAP End-to-End Summary ---")
    print(f"Frames processed: {frame_number}")
    print(f"Total detections: {total_detections}")
    print(f"Total faces: {total_faces}")
    print(f"Total plate OCR results: {total_plates}")
    print(f"Total analytics events: {total_events}")
    print(f"Output video: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()