import cv2
import time

VIDEO = "samples/test_border_feed.mp4"

cap = cv2.VideoCapture(VIDEO)

print("=== VIDEO FRAME TEST ===")
print("Opened:", cap.isOpened())

if not cap.isOpened():
    raise RuntimeError(f"Could not open: {VIDEO}")

fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

print("FPS:", fps)
print("Resolution:", width, "x", height)
print("Total frames:", total)

start = time.time()

for i in range(10):
    ok, frame = cap.read()

    print(
        f"Frame {i + 1}:",
        "OK" if ok else "FAILED",
        frame.shape if frame is not None else None,
    )

cap.release()

print("Elapsed:", round(time.time() - start, 3), "seconds")
print("=== DONE ===")