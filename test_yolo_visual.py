import cv2

from backend.inference.yolo_detector import YOLODetector


VIDEO_PATH = "samples/test_border_feed.mp4"
OUTPUT_PATH = "detection_output.mp4"


def main() -> None:
    detector = YOLODetector(
        model_path="yolo11n.pt",
        confidence_threshold=0.25,
    )

    capture = cv2.VideoCapture(VIDEO_PATH)

    if not capture.isOpened():
        raise RuntimeError(f"Could not open video: {VIDEO_PATH}")

    fps = capture.get(cv2.CAP_PROP_FPS)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if fps <= 0:
        fps = 25.0

    writer = cv2.VideoWriter(
        OUTPUT_PATH,
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )

    if not writer.isOpened():
        capture.release()
        raise RuntimeError(f"Could not create output video: {OUTPUT_PATH}")

    frame_count = 0
    detection_count = 0

    while True:
        success, frame = capture.read()

        if not success:
            break

        frame_count += 1

        detections = detector.detect(frame)
        detection_count += len(detections)

        for detection in detections:
            cv2.rectangle(
                frame,
                (detection.x1, detection.y1),
                (detection.x2, detection.y2),
                (0, 255, 0),
                2,
            )

            label = (
                f"{detection.class_name} "
                f"{detection.confidence:.2f}"
            )

            cv2.putText(
                frame,
                label,
                (detection.x1, max(20, detection.y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
            )

        writer.write(frame)

    capture.release()
    writer.release()

    print("\n--- Visualization Test Summary ---")
    print(f"Frames processed: {frame_count}")
    print(f"Total detections: {detection_count}")
    print(f"Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()