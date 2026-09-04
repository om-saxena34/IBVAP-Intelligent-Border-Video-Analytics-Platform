"""
Sample CCTV Video Generator for IBVAP.
Creates a realistic test surveillance video (MP4) with simulated border area,
moving target, timestamp overlay, and camera ID overlay.
Usage:
    python -m scripts.generate_sample_cctv --output data/sample_cctv.mp4 --duration 10
"""
import argparse
import os
import time

try:
    import cv2
    import numpy as np
except ImportError:
    print("Error: opencv-python and numpy are required to generate sample videos.")
    exit(1)


def generate_video(
    output_path: str = "data/sample_cctv.mp4",
    duration_sec: int = 10,
    fps: int = 25,
    width: int = 640,
    height: int = 480,
    camera_label: str = "CAM_01 - BOP NORTH SECTOR",
):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    total_frames = duration_sec * fps
    print(f"Generating {total_frames} frames ({duration_sec}s @ {fps}fps) -> {output_path}")

    start_timestamp = time.time()

    for f_idx in range(total_frames):
        # Create dark background (night/dusk border patrol setting)
        frame = np.full((height, width, 3), (35, 30, 25), dtype=np.uint8)

        # Draw simulated terrain / border road
        cv2.line(frame, (0, int(height * 0.7)), (width, int(height * 0.7)), (60, 60, 60), 2)
        cv2.fillPoly(
            frame,
            [np.array([[0, height], [width, height], [width, int(height * 0.7)], [0, int(height * 0.7)]])],
            (40, 45, 40),
        )

        # Draw virtual fence boundary line (dotted yellow/red line)
        for x in range(0, width, 20):
            cv2.line(frame, (x, int(height * 0.55)), (x + 10, int(height * 0.55)), (0, 165, 255), 2)

        # Draw moving target (person/vehicle simulated box)
        target_x = int((f_idx * 4) % (width + 100)) - 50
        target_y = int(height * 0.6)
        if -50 <= target_x <= width + 50:
            # Body
            cv2.rectangle(frame, (target_x, target_y - 50), (target_x + 30, target_y), (80, 140, 200), -1)
            # Head
            cv2.circle(frame, (target_x + 15, target_y - 65), 12, (200, 220, 240), -1)

        # CCTV OSD Overlays (Camera ID, Timestamp, FPS)
        current_time_str = time.strftime(
            "%Y-%m-%d %H:%M:%S",
            time.localtime(start_timestamp + (f_idx / fps)),
        )
        # Top banner
        cv2.putText(frame, f"REC [●] {camera_label}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.putText(frame, current_time_str, (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 220, 220), 1)
        cv2.putText(frame, f"FRAME: {f_idx:04d} | 25 FPS", (width - 240, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        out.write(frame)

    out.release()
    print(f"Sample CCTV video generated successfully: {output_path} ({os.path.getsize(output_path)} bytes)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic border CCTV video")
    parser.add_argument("--output", default="data/sample_cctv.mp4", help="Output MP4 file path")
    parser.add_argument("--duration", type=int, default=10, help="Duration in seconds")
    parser.add_argument("--fps", type=int, default=25, help="Frame rate")
    args = parser.parse_args()

    generate_video(output_path=args.output, duration_sec=args.duration, fps=args.fps)
