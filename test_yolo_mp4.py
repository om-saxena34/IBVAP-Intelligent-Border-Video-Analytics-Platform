import cv2

from backend.inference.yolo_detector import YOLODetector

VIDEO_PATH = "samples/test_border_feed.mp4"


def main() -> None:
    detector = YOLODetector(
        model_path="yolo11n.pt",
        confidence_threshold=0.25,
    )

    capture = cv2.VideoCapture(VIDEO_PATH)

    if not capture.isOpened():
        raise RuntimeError(f"Could not open video: {VIDEO_PATH}")

    frame_count = 0
    detection_frames = 0

    while True:
        success, frame = capture.read()

        if not success:
            break

        frame_count += 1

        detections = detector.detect(frame)

        if detections:
            detection_frames += 1

            print(f"\nFrame {frame_count}:")
            for detection in detections:
                print(
                    f"  {detection.class_name}: "
                    f"{detection.confidence:.2f} "
                    f"bbox=({detection.x1}, {detection.y1}, "
                    f"{detection.x2}, {detection.y2})"
                )

        # Test only first 100 frames for now.
        if frame_count >= 100:
            break

    capture.release()

    print("\n--- Detection Test Summary ---")
    print(f"Frames processed: {frame_count}")
    print(f"Frames with detections: {detection_frames}")


if __name__ == "__main__":
    main()