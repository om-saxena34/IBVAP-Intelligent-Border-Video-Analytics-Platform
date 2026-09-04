# IBVAP — Intelligent Border Video Analytics Platform

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![OpenCV](https://img.shields.io/badge/OpenCV-Headless-5C3EE8.svg)](https://opencv.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **"Detect. Understand. Correlate. Respond."**  
> *Turning existing CCTV infrastructure into an intelligent, explainable border-security system.*  
> **SIH 2026 Problem Statement:** AI-Based Intelligent Video Analytics Platform for Border Surveillance using existing CCTV infrastructure.

---

## 1. Project Overview

Border security forces already possess extensive IP CCTV infrastructure across Border Outposts (BOPs), check posts, access roads, and strategic perimeter locations. However, standard CCTV primarily records or depends on constant human monitoring.

**IBVAP** provides a software-defined intelligence and orchestration layer over existing IP CCTV feeds without requiring costly hardware replacement:
- **Phase 1 (Current Milestone)**: CCTV / MP4 Stream Ingestion & Stream Health Monitoring.
- **Phase 2**: Person and Vehicle Detection + Tracking.
- **Phase 3**: Virtual Fence & Zone Management.
- **Phase 4**: ANPR / OCR + Authorized-list Matching.
- **Phase 5**: Loitering, Direction & Night Movement Rules.
- **Phase 6**: Multi-Camera Track ID Correlation.
- **Phase 7**: Border Threat Intelligence Engine + Explainable Scoring.
- **Phase 8**: Evidence Capture & SHA-256 Tamper-Evident Audit Hashing.
- **Phase 9**: Offline-First Local Event Queue & Central Synchronization.
- **Phase 10**: Command-Center Dashboard & End-to-End Demo.

---

## 2. Phase 1 Architecture: Stream Ingestion & Health Monitoring

```
                                  +------------------------------------+
                                  |         Video Source Input         |
                                  | (RTSP IP Camera / Test MP4 Video)  |
                                  +-----------------+------------------+
                                                    |
                                                    v
+--------------------------------------------------------------------------------------------------+
| Stream Ingestion Layer (backend/services)                                                         |
|                                                                                                  |
|   +--------------------------+         +-------------------------------+                         |
|   |   StreamManager          | <-----> |   StreamWorker (Per Camera)   |                         |
|   |   (Registry / Lifecycle) |         |   - Dedicated Reader Thread   |                         |
|   +--------------------------+         |   - Thread-safe Frame Buffer  |                         |
|                                        |   - Drop / Timeout Detection  |                         |
|                                        |   - Auto Exponential Reconnect|                         |
|                                        |   - Instantaneous & Avg FPS   |                         |
|                                        +---------------+---------------+                         |
+--------------------------------------------------------|-----------------------------------------+
                                                         |
                                                         v
+--------------------------------------------------------------------------------------------------+
| FastAPI REST API Layer (backend/api)                                                             |
|                                                                                                  |
|   - GET  /health                      -> Platform status, uptime, online camera count            |
|   - POST /streams/connect             -> Connect camera / MP4 stream                             |
|   - GET  /streams                     -> List all streams with configuration and status          |
|   - GET  /streams/{id}                -> Individual stream detail                                |
|   - GET  /streams/{id}/health         -> Live FPS, resolution, dropped frames, reconnects        |
|   - GET  /streams/{id}/snapshot       -> Real-time decoded JPEG frame preview                    |
|   - POST /streams/{id}/disconnect     -> Clean stream shutdown & resource release                |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Directory Structure

```
ibvap/
├── backend/
│   ├── api/
│   │   ├── health.py               # GET /health & root info
│   │   └── streams.py              # Camera connection, health, disconnect, snapshot APIs
│   ├── models/
│   │   └── camera.py               # Pydantic schemas: StreamStatus, StreamHealth, StreamInfo
│   ├── services/
│   │   ├── stream_worker.py        # OpenCV VideoCapture worker thread, drop detection, auto-reconnect
│   │   └── stream_manager.py       # Thread-safe multi-camera supervisor and lifecycle manager
│   └── main.py                     # FastAPI application entry point, CORS, lifespan management
├── config/
│   └── settings.py                 # Pydantic settings with environment variable overrides
├── scripts/
│   └── generate_sample_cctv.py     # Utility to generate test surveillance MP4 videos
├── tests/
│   ├── conftest.py                 # Pytest fixtures & synthetic video generation
│   ├── test_health.py              # Health endpoint tests
│   ├── test_stream_worker.py       # OpenCV ingestion and failure handling unit tests
│   └── test_streams_api.py         # Stream connection and lifecycle API integration tests
├── requirements.txt                # Production and development dependencies
└── README.md
```

---

## 4. Getting Started & Installation

### 4.1 Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Git

### 4.2 Clone the Repository
```bash
git clone https://github.com/om-saxena34/IBVAP-Intelligent-Border-Video-Analytics-Platform.git
cd IBVAP-Intelligent-Border-Video-Analytics-Platform
```

### 4.3 Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 5. Running the Application

### 5.1 Generate a Sample Surveillance Video (Optional for Testing)
To generate a synthetic 10-second border surveillance MP4 video (`data/sample_cctv.mp4`):
```bash
python -m scripts.generate_sample_cctv --output data/sample_cctv.mp4 --duration 10
```

### 5.2 Start the Backend Server
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
The server will start at `http://127.0.0.1:8000`.
- Interactive Swagger API docs: `http://127.0.0.1:8000/docs`
- Alternative ReDoc documentation: `http://127.0.0.1:8000/redoc`

---

## 6. API Quick Reference

### 6.1 Check Platform Health
```bash
curl -X GET http://127.0.0.1:8000/health
```
**Example Response:**
```json
{
  "status": "healthy",
  "platform": "IBVAP — Intelligent Border Video Analytics Platform",
  "version": "1.0.0-phase1",
  "timestamp": "2026-09-04T11:45:00Z",
  "uptime_seconds": 12.45,
  "total_cameras": 1,
  "online_cameras": 1
}
```

### 6.2 Connect a Video Source (MP4 File or RTSP Stream)
```bash
curl -X POST http://127.0.0.1:8000/streams/connect \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "CAM_01",
    "source_url": "data/sample_cctv.mp4",
    "source_type": "FILE",
    "location": "BOP North Gate Alpha",
    "sector": "Sector 4",
    "loop_video": true
  }'
```

For live RTSP CCTV:
```bash
curl -X POST http://127.0.0.1:8000/streams/connect \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "CAM_RTSP_02",
    "source_url": "rtsp://admin:pass@192.168.1.50:554/stream1",
    "source_type": "RTSP",
    "location": "Sector 3 Perimeter Post",
    "sector": "Sector 3"
  }'
```

### 6.3 Query Real-Time Stream Health & Metrics
```bash
curl -X GET http://127.0.0.1:8000/streams/CAM_01/health
```
**Example Response:**
```json
{
  "camera_id": "CAM_01",
  "status": "ONLINE",
  "fps": 25.0,
  "source_fps": 25.0,
  "resolution": "640x480",
  "total_frames_read": 142,
  "dropped_frames": 0,
  "reconnect_count": 0,
  "last_frame_timestamp": "2026-09-04T11:45:05Z",
  "last_error": null,
  "uptime_seconds": 5.8
}
```

### 6.4 Fetch Live Frame Snapshot
Returns the latest decoded video frame as a JPEG image:
```bash
curl -X GET http://127.0.0.1:8000/streams/CAM_01/snapshot --output preview.jpg
```

### 6.5 Disconnect Stream
```bash
curl -X POST http://127.0.0.1:8000/streams/CAM_01/disconnect
```

---

## 7. Running Automated Tests

Run the complete test suite:
```bash
pytest -v
```

Run tests with verbose logs:
```bash
pytest -v -s
```

---

## 8. Development Roadmap

- [x] **Phase 1**: CCTV / MP4 Stream Ingestion, Health Monitoring, Auto-Reconnect & REST APIs.
- [ ] **Phase 2**: Person & Vehicle Detection + Object Tracking.
- [ ] **Phase 3**: Virtual Fence & Zone Boundary Violation Rules.
- [ ] **Phase 4**: ANPR / OCR & Authorized Vehicle List Verification.
- [ ] **Phase 5**: Suspicious Behaviors: Loitering, Wrong Direction & Night Movement.
- [ ] **Phase 6**: Cross-Camera Logical Track ID Correlation (e.g. `P-1042`).
- [ ] **Phase 7**: Explainable Threat Intelligence Scoring Engine.
- [ ] **Phase 8**: Secure Tamper-Evident SHA-256 Audit Trail & Evidence Export.
- [ ] **Phase 9**: Offline-First Edge Resiliency & Sync Protocol.
- [ ] **Phase 10**: Unified React Command Center Dashboard.

---

## 9. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
