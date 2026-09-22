# IBVAP — Intelligent Border Video Analytics Platform

### AI-Based Video Analytics and Tactical Perimeter Surveillance Platform

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![OpenCV](https://img.shields.io/badge/OpenCV-Headless%204.10-5C3EE8.svg)](https://opencv.org/)
[![Ultralytics YOLO](https://img.shields.io/badge/YOLO-Ultralytics%20YOLOv8%20%2F%20YOLO11-00FFFF.svg)](https://docs.ultralytics.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%2F%206.x-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![UI Concept: FORGE COMMAND](https://img.shields.io/badge/UI%2FUX-FORGE%20COMMAND-9F4032.svg)](#14-frontend-capabilities)

---

## Table of Contents

- [1. Project Title](#1-project-title)
- [2. Short Description](#2-short-description)
- [3. Project Status / Development Status](#3-project-status--development-status)
- [4. Overview](#4-overview)
- [5. Problem Statement](#5-problem-statement)
- [6. Objectives](#6-objectives)
- [7. What Is Currently Implemented](#7-what-is-currently-implemented)
- [8. Partially Implemented / Experimental Features](#8-partially-implemented--experimental-features)
- [9. Planned Future Integrations](#9-planned-future-integrations)
- [10. Current System Architecture](#10-current-system-architecture)
- [11. Current AI/Computer Vision Pipeline](#11-current-aicomputer-vision-pipeline)
- [12. Implemented Analytics Modules](#12-implemented-analytics-modules)
- [13. Backend and API Capabilities](#13-backend-and-api-capabilities)
- [14. Frontend Capabilities](#14-frontend-capabilities)
- [15. Technology Stack](#15-technology-stack)
- [16. Project Structure](#16-project-structure)
- [17. Installation and Setup](#17-installation-and-setup)
- [18. Running the Application](#18-running-the-application)
- [19. API Reference](#19-api-reference)
- [20. Testing](#20-testing)
- [21. Sample CCTV Video Usage](#21-sample-cctv-video-usage)
- [22. Current Limitations](#22-current-limitations)
- [23. Future Roadmap](#23-future-roadmap)
- [24. Project Ownership and Development Note](#24-project-ownership-and-development-note)
- [25. License](#25-license)
  - [Project-Use Note & Operational Disclaimer](#project-use-note--operational-disclaimer)
  - [Repository Usage & Attribution](#repository-usage--attribution)
  - [Third-Party Software & Dependencies](#third-party-software--dependencies)
- [26. Disclaimer](#26-disclaimer)

---

## 1. Project Title

**IBVAP — Intelligent Border Video Analytics Platform**

---

## 2. Short Description

**IBVAP** is an AI-powered surveillance and video analytics platform engineered to convert legacy, non-AI IP CCTV infrastructure into an active, automated perimeter intrusion detection system. Combining deep-learning object detection (YOLO) and multi-object tracking (ByteTrack) with rule-based behavioral heuristics (tripwires, restricted zones, loitering, wrong-direction, group movement, and night movement) and an industrial command interface (**FORGE COMMAND**), IBVAP provides real-time threat detection, multi-stream ingestion, and operational incident triage without requiring expensive proprietary smart cameras.

---

## 3. Project Status / Development Status

| Metric | Status |
| :--- | :--- |
| **Development Phase** | **Functional Proof-of-Concept Prototype (Phase 1 & Phase 2 Complete)** |
| **Backend State** | Operational FastAPI service with multi-threaded stream ingestion, live MJPEG streaming, and analytics engine |
| **Frontend State** | Fully operational React 19 + TypeScript + Vite surveillance command center (**FORGE COMMAND**) |
| **Inference Models** | Ultralytics YOLO (`yolo11n.pt` / `yolov8n.pt`) + ByteTrack active; EasyOCR & Haar Cascades integrated |
| **Persistence** | In-memory state (streams, events, alerts, zones) with local disk evidence capture (`evidence/`) |
| **Authentication** | Planned / Open API (no user authentication or RBAC currently enforced) |
| **Deployment** | Local workstation / development server (no Docker containerization or CI/CD pipelines currently configured) |

---

## 4. Overview

Border Outposts (BOPs), perimeter checkpoints, access corridors, and critical infrastructure installations rely heavily on networks of fixed optical and infrared CCTV cameras. Traditional surveillance relies almost exclusively on human operators continuously watching banks of video monitors. In high-density or prolonged shift environments, this manual monitoring model leads to attention fatigue, missed incursions, and delayed response times.

Replacing operational camera installations with proprietary "smart cameras" involves massive capital expenditure, vendor lock-in, and operational disruption.

**IBVAP** implements a **software-defined intelligence layer** that interfaces directly with existing camera streams via standard protocols (RTSP, video files, or USB webcams). The platform runs decoupled background ingestion threads, applies deep-learning detection and tracking, evaluates spatial and behavioral rules against user-configured perimeter geometry, calculates multi-signal risk scores, and streams annotated video and telemetry directly to an operator dashboard.

---

## 5. Problem Statement

Border security agencies and perimeter facility operators face three persistent technical and operational bottlenecks:
1. **Passive Forensics over Active Prevention**: Standard CCTV cameras record footage to Network Video Recorders (NVRs) for post-incident review rather than alerting operators during an active breach.
2. **Operator Cognitive Overload**: Human operators cannot maintain continuous focus across multiple camera feeds simultaneously without experiencing cognitive fatigue and missed incursions.
3. **Prohibitive Hardware Upgrade Costs**: Replacing working analog or standard IP cameras with proprietary edge-AI camera hardware requires substantial budget allocation and installation downtime.
4. **Disjointed Analytics Solutions**: Existing commercial solutions often isolate object detection from behavioral tracking, zone calibration, and unified operator triage.

IBVAP solves these challenges by ingesting existing video feeds into a centralized computer vision pipeline that automates perimeter boundary enforcement in real time.

---

## 6. Objectives

- **Hardware Independence**: Process standard RTSP video streams from commodity CCTV cameras, local MP4/AVI surveillance archives, and USB capture inputs without proprietary hardware dependencies.
- **Accurate Real-Time Detection**: Classify and track security-relevant entities (persons, vehicles, bicycles, motorcycles, buses, trucks) across consecutive frames.
- **Configurable Spatial Geometry**: Provide operators with interactive coordinate calibration for virtual tripwire lines and restricted perimeter polygons.
- **Behavioral Rule Automation**: Automate detection of loitering, wrong-direction movement, group gatherings, and movement during low-light night periods.
- **Explainable Multi-Signal Risk Scoring**: Synthesize multiple disparate infractions into a 0–100 composite risk score to prevent alarm fatigue.
- **Mission-Control Operator Experience**: Deliver a responsive, low-latency command dashboard (**FORGE COMMAND**) supporting multi-tile surveillance grids, real-time MJPEG streams, incident resolution, and diagnostics.

---

## 7. What Is Currently Implemented

The following components are fully functional and verifiable in the project codebase:

### Current Feature Status Table

| Feature / Capability | Current Status | Codebase Evidence & Operational Notes |
| :--- | :--- | :--- |
| **CCTV / Video Ingestion** | **Implemented** | [`StreamWorker`](file:///backend/services/stream_worker.py) decodes RTSP streams, MP4 files (with looping), and webcams via OpenCV. Manages thread-safe ring buffering, dropped frame tracking, and automatic reconnection with exponential backoff. |
| **Object Detection** | **Implemented** | [`YOLODetector`](file:///backend/inference/yolo_detector.py) utilizes Ultralytics YOLO (`yolo11n.pt` / `yolov8n.pt`) with confidence filtering across 7 target classes (`person`, `bicycle`, `car`, `motorcycle`, `bus`, `truck`, `train`). |
| **Multi-Object Tracking** | **Implemented** | [`ObjectTracker`](file:///backend/inference/tracker.py) executes Ultralytics ByteTrack (`bytetrack.yaml`) with persistent track IDs and centroid trajectory tracking across frames. |
| **Virtual Fence (Tripwire)** | **Implemented** | [`VirtualFence`](file:///backend/analytics/virtual_fence.py) tracks 2D vector cross-products of entity centroids across configured line segments `((x1, y1), (x2, y2))` and triggers `virtual_fence_crossing` events on sign changes. |
| **Restricted Zone Detection** | **Implemented** | [`RestrictedZoneDetector`](file:///backend/analytics/restricted_zone.py) executes point-in-polygon tests (`cv2.pointPolygonTest`) to detect centroid intrusion into arbitrary polygonal boundaries. |
| **Loitering Detection** | **Implemented** | [`LoiteringDetector`](file:///backend/analytics/loitering.py) monitors track dwell duration against a configurable threshold (e.g., 15s) with a 2.0s grace period for brief detection dropouts. |
| **Wrong-Direction Movement** | **Implemented** | [`WrongDirectionDetector`](file:///backend/analytics/wrong_direction.py) computes vector dot-products between observed displacement ($\ge 5\text{ px}$) and an expected unit vector; triggers when dot product $< -0.5$. |
| **Group Movement Detection** | **Implemented** | [`GroupMovementDetector`](file:///backend/analytics/group_movement.py) evaluates pairwise Euclidean distances between centroids; triggers when $\ge 3$ tracked entities cluster within $120\text{ px}$. |
| **Night Movement Detection** | **Implemented** | [`NightMovementDetector`](file:///backend/analytics/night_movement.py) evaluates average grayscale frame luminance; triggers `night_movement` when brightness $< 60.0$ and moving tracks are observed. |
| **Suspicious Activity Scoring** | **Implemented** | [`SuspiciousActivityScorer`](file:///backend/analytics/suspicious_activity.py) aggregates active behavioral signals into an explainable 0–100 risk score and mapped risk tier (`NORMAL`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). |
| **Live MJPEG Video Streaming** | **Implemented** | [`StreamWorker.generate_mjpeg_stream_async`](file:///backend/services/stream_worker.py) serves multipart JPEG streams (`/streams/{id}/live`) with real-time tactical bounding boxes, track labels, and HUD overlays. |
| **Event & Alert Lifecycle** | **Implemented** | [`EventService`](file:///backend/services/event_service.py) logs events with 5.0s deduplication cooldown; automatically escalates `HIGH` and `CRITICAL` events to [`AlertService`](file:///backend/services/alert_service.py), supporting manual alert resolution. |
| **Evidence Snapshot Capture** | **Implemented** | Stored to local disk in `evidence/` directory as timestamped JPEG files upon event trigger. |
| **FORGE COMMAND Frontend** | **Implemented** | Full React 19 + TypeScript web application with 9 dedicated operational views, layout controls (1×1, 1×2, 2×2, 3×2), navigation rail, command bar, and `Ctrl+K` palette. |
| **Automated Test Suite** | **Implemented** | 30 tests in [`tests/`](file:///tests/) passing via Pytest covering API routes, health, frame normalization, intelligence rules, and worker lifecycles. |

---

## 8. Partially Implemented / Experimental Features

Certain modules exist in code and are operational in standalone or demo pipelines, but have recognized prototype boundaries:

1. **Crop-Based ANPR (License Plate Recognition)**:
   - **Current Status**: *Experimental Prototype*.
   - **Code**: [`ANPR`](file:///backend/inference/anpr.py).
   - **Implementation**: Uses EasyOCR (`en`) running strictly on cropped vehicle bounding boxes (lower 65% crop) with track-level caching to avoid per-frame re-computation.
   - **Limitations**: Relies on general English OCR rather than a specialized license plate character model; sensitive to plate angle, camera resolution, motion blur, and illumination.
2. **Face Detection**:
   - **Current Status**: *Prototype Level*.
   - **Code**: [`FaceDetector`](file:///backend/inference/face_detector.py).
   - **Implementation**: Uses classic OpenCV Haar Feature-based Cascade Classifiers (`haarcascade_frontalface_default.xml`). Runs every 30 frames or when persons are in near-field view.
   - **Limitations**: Detects facial presence only. Does **not** perform identity recognition, facial feature matching, embedding generation, or watchlist queries.
3. **Suspicious Sequence Correlation**:
   - **Current Status**: *Partially Implemented (Simulation-Oriented)*.
   - **Code**: [`IntelligenceService.evaluate_movement`](file:///backend/services/intelligence_service.py) and `/intelligence/simulate`.
   - **Implementation**: Evaluates temporal sequences of infractions (e.g., restricted zone entry followed by loitering) across simulated or tracked movement payloads within a 60-second window.
4. **Zone Management Persistence**:
   - **Current Status**: *In-Memory Runtime Configuration*.
   - **Code**: [`zones.py`](file:///backend/api/zones.py) and [`StreamManager.update_camera_zones`](file:///backend/services/stream_manager.py).
   - **Implementation**: Operators can update tripwire lines and restricted polygons dynamically via the UI or REST API. However, configurations are held in memory by active `StreamWorker` instances and reset to defaults upon server restart.
5. **Station Settings**:
   - **Current Status**: *Client-Side Persistence Only*.
   - **Code**: [`SettingsPage.tsx`](file:///frontend/src/pages/SettingsPage.tsx).
   - **Implementation**: Preferences (telemetry polling interval, default stream mode, AI overlay default, audible sirens, confidence threshold) are saved to browser `localStorage`. No server-side persistence exists.

---

## 9. Planned Future Integrations

The following capabilities are **not yet implemented or integrated** in the current repository and represent planned roadmap items:

| Feature to Integrate | Why It Is Useful | Target Module | Work Required | Timeline |
| :--- | :--- | :--- | :--- | :--- |
| **Persistent SQL / NoSQL Database** | Prevent data loss on backend restarts; enable long-term forensic search and audit compliance. | `backend/services/event_service.py`, `alert_service.py` | Add SQLAlchemy / Alembic migrations with PostgreSQL or SQLite backing store for camera configs, events, alerts, and zones. | Short-Term |
| **User Authentication & RBAC** | Restrict camera controls, zone edits, and alert acknowledgments to authorized security personnel. | `backend/api/`, `frontend/src/` | Implement JWT authentication, password hashing (bcrypt), session tokens, and role-based permissions (Admin, Operator, Auditor). | Short-Term |
| **WebSocket Telemetry Stream** | Eliminate periodic HTTP polling (currently every 3–5s) for events and alerts, reducing latency and network overhead. | `backend/api/`, `frontend/src/hooks/` | Implement FastAPI WebSocket route (`/ws/telemetry`) broadcasting live events and detections directly to subscribed browser clients. | Medium-Term |
| **Specialized Deep-Learning ANPR** | Deliver high-accuracy license plate extraction across diverse formats, angles, and low-light environments. | `backend/inference/anpr.py` | Replace general EasyOCR with a dedicated plate-localization model (e.g., YOLO plate detector) paired with a fine-tuned CRNN/LPRNet OCR model. | Medium-Term |
| **Thermal & Infrared (FLIR) Processing** | Enable robust perimeter monitoring in complete darkness, adverse weather, fog, and smoke. | `backend/services/frame_processor.py` | Add thermal palette normalization, adaptive histogram equalization (CLAHE), and models trained on thermal border datasets. | Medium-Term |
| **Cross-Camera Re-Identification (Re-ID)** | Maintain unified track history of individuals and vehicles as they transition across non-overlapping camera fields of view. | `backend/inference/tracker.py`, `backend/services/` | Integrate deep appearance feature extractor (e.g., OSNet) with cosine similarity vector matching across camera boundaries. | Long-Term |
| **Automated Field Notifications** | Instantly alert rapid response teams and field patrols during Critical perimeter breaches. | `backend/services/alert_service.py` | Implement webhook dispatchers supporting Telegram, Slack, SMS gateways, and secure SMTP email notifications. | Medium-Term |
| **Docker & Edge Deployment Packages** | Provide reproducible containerized deployments for edge servers and multi-node clusters. | Root repository | Create multi-stage `Dockerfile`, `docker-compose.yml` with NVIDIA runtime GPU passthrough support, and deployment guides. | Short-Term |

---

## 10. Current System Architecture

IBVAP uses a multi-threaded asynchronous architecture separating video stream ingestion from heavy computer vision inference:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VIDEO INGESTION LAYER                           │
│  RTSP IP CCTV Feeds  │  Local Surveillance MP4s  │  USB / Webcams      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     STREAM WORKER (Per-Camera Thread)                  │
│  - OpenCV VideoCapture Ingestion                                       │
│  - Reconnect & Exponential Backoff Supervisor                          │
│  - Circular Ring Buffer (Max 10 Frames)                                │
│  - Real-Time FPS & Dropped Frame Calculation                           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       ┌─────────────────────────┐      ┌─────────────────────────┐
       │   CAPTURE THREAD        │      │   ANALYTICS THREAD      │
       │   Continuous 25-30 FPS  │      │   Periodic 5 Hz Loop    │
       └─────────────────────────┘      └────────────┬────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      AI & ANALYTICS PIPELINE                           │
│  - Frame Normalization (FrameProcessor)                                │
│  - YOLOv8 / YOLO11 Inference (Ultralytics)                             │
│  - ByteTrack Multi-Object Tracking (Persistent Track IDs)              │
│  - Spatial & Behavioral Rules Engine:                                  │
│    • Virtual Fence (Tripwire Cross-Product)                            │
│    • Restricted Zone (Point-in-Polygon Test)                           │
│    • Loitering Detector (Dwell-Time Monitoring)                        │
│    • Wrong Direction Detector (Vector Dot-Product)                     │
│    • Group Movement Detector (Spatial Centroid Clustering)             │
│    • Night Movement Detector (Mean Grayscale Luminance)                │
│    • Face Presence Detector (Haar Cascade)                             │
│    • Vehicle Crop ANPR (EasyOCR)                                       │
│    • Suspicious Activity Scorer (Composite 0-100 Score)                │
│  - Tactical HUD Annotation Generation                                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     EVENT & ALERT DISPATCH LAYER                       │
│  - Analytics Event Bridge (Normalization)                              │
│  - EventService (5.0s Cooldown Deduplication, In-Memory)               │
│  - AlertService (HIGH / CRITICAL Escalation, Manual Resolution)        │
│  - Evidence Snapshot Storage (JPEG to evidence/ Directory)             │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       FASTAPI REST & STREAMING       │  │    FORGE COMMAND FRONTEND    │
│  - /streams (Connect, Health, Live)  │  │  - React 19 + TypeScript     │
│  - /events & /alerts                 │  │  - Multi-Tile Surveillance   │
│  - /intelligence/zones               │  │  - Zone Calibration Modal    │
│  - /analytics/summary                │  │  - Incident Triage Table     │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 11. Current AI/Computer Vision Pipeline

```
Raw Frame ──► Normalization ──► YOLO Detection ──► ByteTrack Association ──► Parallel Analytics ──► Threat Scorer ──► Tactical HUD
```

1. **Frame Ingestion & Preprocessing**:
   - Frames decoded via OpenCV `cv2.VideoCapture`.
   - Normalization handled by [`FrameProcessor`](file:///backend/services/frame_processor.py) (ensuring 3-channel BGR format and valid dimensions).
   - Ingestion metrics tracked continuously (FPS, total frames, dropped frames).
2. **Object Detection**:
   - Frames fed to Ultralytics YOLO (`yolo11n.pt` / `yolov8n.pt`).
   - Filters bounding boxes for classes: `person`, `bicycle`, `car`, `motorcycle`, `bus`, `truck`, `train`.
   - Extracts coordinates $(x_1, y_1, x_2, y_2)$, class names, and confidence scores.
3. **Multi-Object Tracking (ByteTrack)**:
   - Associates detections across frames using ByteTrack (`tracker="bytetrack.yaml"`).
   - Assigns a stable integer `track_id` to each entity to maintain continuous motion trajectory.
4. **Parallel Analytics Evaluation**:
   - Centroids $(x_c, y_c)$ and bounding boxes evaluated against active virtual fences, restricted polygons, directional vectors, dwell counters, and spatial cluster groups.
5. **Specialized Inference**:
   - Evaluates face presence via Haar Cascades on near-field subjects.
   - Crops detected vehicle bounding boxes and passes them to EasyOCR for alphanumeric license plate extraction.
6. **Threat Scoring & Annotation**:
   - Active infractions evaluated by the `SuspiciousActivityScorer` to assign a composite 0–100 threat score.
   - Renders tactical HUD overlays (bounding boxes, track IDs, zone polygons, tripwire lines, status reticles) directly onto the frame for MJPEG output.

---

## 12. Implemented Analytics Modules

### 1. Virtual Fence (Tripwire)
- **File**: [`backend/analytics/virtual_fence.py`](file:///backend/analytics/virtual_fence.py)
- **Algorithm**: Evaluates the 2D cross-product between the object centroid and the line vector $( (x_1, y_1), (x_2, y_2) )$:
  $$\text{Cross Product} = (x_2 - x_1)(y_c - y_1) - (y_2 - y_1)(x_c - x_1)$$
- **Trigger**: A sign transition relative to the previous frame indicates crossing, emitting a `virtual_fence_crossing` event.

### 2. Restricted Zone Entry
- **File**: [`backend/analytics/restricted_zone.py`](file:///backend/analytics/restricted_zone.py)
- **Algorithm**: Evaluates object centroid against an arbitrary polygonal boundary using `cv2.pointPolygonTest`.
- **Trigger**: Centroids returning $\ge 0$ (inside or on contour boundary) emit a `restricted_zone_entry` event.

### 3. Loitering Detection
- **File**: [`backend/analytics/loitering.py`](file:///backend/analytics/loitering.py)
- **Algorithm**: Tracks initial detection timestamp (`first_seen`) per `track_id`. Computes elapsed duration:
  $$\Delta t = t_{\text{current}} - t_{\text{first\_seen}}$$
- **Trigger**: When $\Delta t \ge \text{threshold\_seconds}$ (default: 15.0s), emits a `loitering` event with recorded duration. An internal flag suppresses duplicate triggers for the same active track.

### 4. Wrong-Direction Movement
- **File**: [`backend/analytics/wrong_direction.py`](file:///backend/analytics/wrong_direction.py)
- **Algorithm**: Computes displacement vector $\vec{v} = (x_{\text{curr}} - x_{\text{prev}}, y_{\text{curr}} - y_{\text{prev}})$ for movements $\ge 5.0\text{ px}$. Computes dot product with normalized expected vector $\vec{u}$:
  $$\text{Dot Product} = \vec{v} \cdot \vec{u}$$
- **Trigger**: When $\vec{v} \cdot \vec{u} < -0.5$, motion is contrary to the authorized direction, emitting a `wrong_direction` event.

### 5. Group Movement Detection
- **File**: [`backend/analytics/group_movement.py`](file:///backend/analytics/group_movement.py)
- **Algorithm**: Evaluates pairwise Euclidean distances between centroids of all active tracked subjects.
- **Trigger**: When $\ge 3$ distinct track IDs cluster within a distance threshold ($120.0\text{ px}$), emits a `group_movement` event with member track IDs and cluster size.

### 6. Night Movement Detection
- **File**: [`backend/analytics/night_movement.py`](file:///backend/analytics/night_movement.py)
- **Algorithm**: Computes mean luminance of the frame in grayscale:
  $$\mu_L = \frac{1}{W \times H} \sum_{x, y} I_{\text{gray}}(x, y)$$
- **Trigger**: When $\mu_L < 60.0$ and moving tracked entities change centroid position, emits a `night_movement` event.

### 7. Multi-Signal Suspicious Activity Scoring
- **File**: [`backend/analytics/suspicious_activity.py`](file:///backend/analytics/suspicious_activity.py)
- **Algorithm**: Multi-signal accumulator combining individual behavioral violations into a unified score (0–100):
  - Restricted Zone Entry: `+40 pts`
  - Virtual Fence Crossing: `+35 pts`
  - Wrong Direction: `+25 pts`
  - Loitering: `+20 pts`
  - Night Movement: `+20 pts`
  - Group Movement: `+15 pts`
- **Thresholds**:
  - `0 – 24 pts`: **NORMAL**
  - `25 – 49 pts`: **LOW RISK**
  - `50 – 69 pts`: **MEDIUM RISK**
  - `70 – 84 pts`: **HIGH RISK**
  - `85 – 100 pts`: **CRITICAL**
- **Trigger**: When score $\ge 50$ or $\ge 2$ distinct infractions occur for a track, a composite `suspicious_activity` event is generated with human-readable rationale.

---

## 13. Backend and API Capabilities

The backend is built with **FastAPI** and structured into decoupled domain services:
- **`StreamManager`**: Central registry managing lifecycle, health queries, and thread safety across all camera workers.
- **`StreamWorker`**: Independent worker thread per camera executing capture, reconnection, buffering, and coordinating the analytics thread.
- **`AnalyticsEngine`**: Pipeline orchestrator initializing YOLO, ByteTrack, Haar cascades, EasyOCR, and spatial detectors.
- **`EventService`**: Thread-safe event repository with 5.0s deduplication cooldown window.
- **`AlertService`**: Active/resolved alert manager with severity filtering and manual resolution.
- **`IntelligenceService`**: High-level zone rules and test simulation engine.

---

## 14. Frontend Capabilities

The frontend is implemented with **React 19**, **TypeScript**, and **Vite**, featuring the **"FORGE COMMAND"** dark tactical operations design system:

### Operational Pages & Routes

| Page | Route | Features & Current Status |
| :--- | :--- | :--- |
| **Overview Dashboard** | `/` | Operational overview with live KPIs, active alert feeds, camera status breakdown, radar sweep widget, and real-time telemetry from `/analytics/summary`. Fully functional. |
| **Live Surveillance** | `/surveillance` | Multi-camera surveillance workstation supporting 1×1 Focus, 1×2 Split, 2×2 Quad, and 3×2 Six-Up layouts. Each tile streams independent MJPEG video with fallback snapshot polling, HUD reticles, FPS counters, and overlay toggles. Fully functional. |
| **Camera Nodes** | `/cameras` | Fleet registry with Table and Card views, instant search by ID/sector, status filters, and one-click Start/Stop/Disconnect controls. Fully functional. |
| **Threat Alerts** | `/alerts` | Incident feed filtering by status (`ACTIVE`, `RESOLVED`) and severity (`CRITICAL`, `HIGH`, etc.), search, one-click **Resolve**, and simulated incident triggers. Fully functional. |
| **Event History** | `/events` | Searchable audit ledger tracking boundary crosses, detections, and rule triggers with category filters and simulation triggers. Fully functional. |
| **Zone Management** | `/zones` | Coordinate calibration interface for virtual fence lines and restricted zone polygons with live snapshot preview and preset buttons. Fully functional. |
| **Intelligence Analytics** | `/analytics` | Real telemetry aggregations from `/analytics/summary` showing event type breakdowns, severity distributions, and detection totals. Fully functional. |
| **System Diagnostics** | `/health` | Hardware and pipeline console tracking OpenCV worker status, dropped frames, uptime, and gateway connectivity. Fully functional. |
| **Station Settings** | `/settings` | Operational preferences persisted to browser `localStorage` (telemetry intervals, default viewports, overlay toggles, audible sirens, confidence thresholds). Client-side persistence. |

### Core UI Components
- **`NavigationRail.tsx`**: Collapsible vertical rail with tactical three-letter callsign glyphs (`OVW`, `OPS`, `NOD`, `ALT`, `EVT`, `ZON`, `INT`, `SYS`, `SET`) and live badge counters.
- **`CommandBar.tsx`**: Mission bar displaying synchronized Local Station Time, UTC Time, station status, and quick search trigger.
- **`CommandPalette.tsx`**: Keyboard-navigable quick command launcher (`Ctrl+K` / `Cmd+K`) for jumping across views and triggering common actions.
- **`ConnectCameraModal.tsx`**: Multi-protocol connection dialog supporting RTSP URLs, local file paths, webcam device indices, drag-and-drop file upload, and an 8-item sample CCTV preset gallery.
- **`SurveillanceCameraTile.tsx`**: Viewport tile with independent MJPEG streaming, snapshot fallback polling (1.5s), HUD reticles, and fullscreen view.

---

## 15. Technology Stack

### Backend
- **Python 3.10+ / 3.12**: Core runtime environment.
- **FastAPI (0.110+)**: High-performance asynchronous REST API framework and streaming server.
- **Uvicorn (0.28+)**: ASGI production-grade web server.
- **OpenCV Headless (4.10.0.84)**: Video capture, image decoding, geometric transforms, and Haar cascades.
- **Ultralytics (8.4.140)**: YOLOv8 / YOLO11 object detection and ByteTrack multi-object tracking.
- **PyTorch**: Deep learning tensor execution engine.
- **EasyOCR (1.7.1)**: Optical character recognition engine for vehicle license plate crops.
- **NumPy (1.24+)**: Vector mathematics and array processing.
- **Pydantic (2.6+) & pydantic-settings**: Request validation and application settings.

### Frontend
- **React (19.2+)**: Component-based UI library.
- **TypeScript (~6.0)**: Strict static type checking.
- **Vite (8.2+)**: Frontend build tooling and fast HMR development server.
- **React Router DOM (7.18+)**: Client-side single-page application routing.
- **Vanilla CSS (FORGE COMMAND)**: Bespoke dark tactical surveillance design system with zero external UI framework dependencies.

---

## 16. Project Structure

```
IBVAP-Intelligent-Border-Video-Analytics-Platform/
├── backend/
│   ├── analytics/                      # Rule-based security analytics detectors
│   │   ├── group_movement.py           # Spatial clustering & group movement
│   │   ├── loitering.py                # Dwell-time loitering detector
│   │   ├── night_movement.py           # Low-light luminance movement detector
│   │   ├── restricted_zone.py          # Point-in-polygon zone intrusion detector
│   │   ├── suspicious_activity.py      # Multi-signal composite threat scoring (0-100)
│   │   ├── virtual_fence.py            # Line-crossing tripwire detector
│   │   └── wrong_direction.py          # Vector dot-product direction detector
│   ├── api/                            # FastAPI route handlers
│   │   ├── alerts.py                   # Alert query and resolution endpoints
│   │   ├── analytics.py                # Telemetry summary & frame analysis
│   │   ├── events.py                   # Event query and logging endpoints
│   │   ├── health.py                   # System health, uptime, and camera counts
│   │   ├── intelligence.py             # Zones list, evaluate movement, and simulations
│   │   ├── streams.py                  # Stream connection, live MJPEG, snapshots, upload
│   │   └── zones.py                    # Dynamic camera zone geometry configuration
│   ├── inference/                      # Deep learning inference wrappers
│   │   ├── anpr.py                     # Crop-optimized EasyOCR license plate recognition
│   │   ├── face_detector.py            # OpenCV Haar-cascade face detector
│   │   ├── tracker.py                  # YOLO + ByteTrack multi-object tracker
│   │   └── yolo_detector.py            # YOLO detector wrapper and bounding box parser
│   ├── models/                         # Pydantic schemas & dataclasses
│   │   ├── alert.py                    # Alert, Severity, and AlertStatus schemas
│   │   ├── camera.py                   # StreamConnectRequest, StreamHealth, StreamInfo
│   │   ├── detection.py                # BoundingBox and DetectionResult dataclasses
│   │   ├── event.py                    # Event and CreateEventRequest schemas
│   │   └── zone.py                     # ZoneConfig, Point, and MovementTrack schemas
│   ├── services/                       # Core application services
│   │   ├── alert_service.py            # In-memory alert management and resolution
│   │   ├── analytics_engine.py         # Unified video analytics pipeline orchestrator
│   │   ├── analytics_event_bridge.py   # Normalization bridge from analytics to events
│   │   ├── event_service.py            # In-memory event repository with 5s deduplication
│   │   ├── frame_processor.py          # Frame validation and normalization
│   │   ├── intelligence_service.py     # High-level zone rules and test simulation engine
│   │   ├── stream_manager.py           # Multi-camera registry and lifecycle manager
│   │   └── stream_worker.py            # Multi-threaded background camera ingestion worker
│   └── main.py                         # FastAPI entry point, CORS, and lifecycle setup
├── config/
│   └── settings.py                     # Centralized settings with environment variable support
├── frontend/                           # React + TypeScript command center dashboard
│   ├── src/
│   │   ├── api/                        # Typed HTTP client modules (streams, alerts, events, etc.)
│   │   ├── components/                 # UI components (CommandBar, NavigationRail, tiles, modals)
│   │   ├── hooks/                      # Custom hooks (useHealth, useStreams, useAlerts, useEvents)
│   │   ├── pages/                      # 9 operational pages (Dashboard, Surveillance, Cameras, etc.)
│   │   ├── App.css                     # FORGE COMMAND dark industrial theme styles
│   │   ├── App.tsx                     # Main layout shell and route definitions
│   │   ├── index.css                   # CSS reset and tactical typography tokens
│   │   └── main.tsx                    # React client entry point
│   ├── package.json                    # Frontend dependencies and scripts
│   ├── tsconfig.json                   # TypeScript compiler configuration
│   └── vite.config.ts                  # Vite build configuration
├── evidence/                           # Local disk storage for event evidence snapshot JPEGs
├── samples/                            # Sample CCTV footage for demonstration and evaluation
├── scripts/
│   └── generate_sample_cctv.py         # Synthetic CCTV video generator utility
├── tests/                              # Automated Pytest suite (30 passing tests)
│   ├── conftest.py                     # Shared test fixtures and mocks
│   ├── test_alerts_api.py              # Alert endpoint tests
│   ├── test_events_api.py              # Event logging and query tests
│   ├── test_frame_processor.py         # Frame normalization tests
│   ├── test_health.py                  # Health check tests
│   ├── test_intelligence.py            # Perimeter rules and correlation tests
│   ├── test_stream_worker.py           # Ingestion thread failure and reconnect tests
│   └── test_streams_api.py             # Camera stream lifecycle tests
├── test_full_pipeline.py               # Standalone end-to-end video analytics benchmark script
├── test_multi_object.py                # Standalone multi-object detection test script
├── LICENSE                             # MIT Open-Source License
├── pytest.ini                          # Pytest configuration
├── requirements.txt                    # Python backend dependencies
└── README.md                           # Complete project documentation
```

---

## 17. Installation and Setup

### Prerequisites
- **Operating System**: Windows 10/11, Ubuntu 20.04/22.04 LTS, or macOS
- **Python**: Version 3.10 to 3.12
- **Node.js**: Version 18+ or 20+ (with npm)
- **Git**: Installed and configured

### Step 1: Clone the Repository
```bash
git clone https://github.com/om-saxena34/IBVAP-Intelligent-Border-Video-Analytics-Platform.git
cd IBVAP-Intelligent-Border-Video-Analytics-Platform
```

### Step 2: Backend Setup
1. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

2. Install Python dependencies:
   ```bash
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

> **Note on Model Weights**: On first startup, Ultralytics will automatically download the standard `yolov8n.pt` / `yolo11n.pt` weights if not already present in the workspace root.

### Step 3: Frontend Setup
In a separate terminal window, navigate to the `frontend` folder and install dependencies:
```bash
cd frontend
npm install
```

---

## 18. Running the Application

### 1. Start the Backend API Server
From the repository root (with virtual environment activated):
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- **API Base URL**: `http://127.0.0.1:8000`
- **Swagger Interactive API Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

### 2. Start the Frontend Command Dashboard
From the `frontend` directory:
```bash
cd frontend
npm run dev
```
- **Web Interface**: `http://localhost:5173`

Open `http://localhost:5173` in any modern web browser to access the command center.

---

## 19. API Reference

The FastAPI backend provides documented REST endpoints. All endpoints return JSON unless streaming media.

### System & Health
| Method | Endpoint | Description | Request / Params | Response Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Root platform metadata | None | Platform title, version, status, endpoint URLs | Implemented |
| `GET` | `/health` | System health & uptime | None | Status (`healthy`), uptime, total/online camera counts | Implemented |

### Video Streams (`/streams`)
| Method | Endpoint | Description | Request / Params | Response Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/streams/connect` | Register and launch camera worker | `StreamConnectRequest` (JSON) | `StreamInfo` with initial health | Implemented |
| `POST` | `/streams/upload` | Upload video to `samples/` | Multipart form `file` | File path, name, size | Implemented |
| `GET` | `/streams/samples` | List sample videos in `samples/` | None | Array of available sample video files | Implemented |
| `GET` | `/streams` | List all registered camera streams | None | Array of `StreamInfo` objects | Implemented |
| `GET` | `/streams/{id}` | Get stream details | Path: `id` (camera_id) | `StreamInfo` object | Implemented |
| `GET` | `/streams/{id}/health`| Get real-time health metrics | Path: `id` | `StreamHealth` (FPS, dropped frames, status) | Implemented |
| `GET` | `/streams/{id}/detections`| Get latest detection telemetry | Path: `id` | Track counts, classes, threat level, capabilities | Implemented |
| `GET` | `/streams/{id}/live` | Live MJPEG video stream | Query: `annotated=true` | Multipart JPEG video stream (`x-mixed-replace`) | Implemented |
| `GET` | `/streams/{id}/snapshot`| Get latest single frame JPEG | Query: `annotated=true` | Single `image/jpeg` binary | Implemented |
| `POST` | `/streams/{id}/disconnect`| Stop stream worker | Path: `id` | `StreamDisconnectResponse` | Implemented |
| `DELETE`| `/streams/{id}` | Stop stream worker (DELETE) | Path: `id` | `StreamDisconnectResponse` | Implemented |

### Events & Alerts (`/events`, `/alerts`)
| Method | Endpoint | Description | Request / Params | Response Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/events` | Log a detected event | `CreateEventRequest` (JSON) | Created `Event` (triggers alert if HIGH/CRITICAL) | Implemented |
| `GET` | `/events` | List all recorded events | Query: `camera_id` (optional) | `EventListResponse` with events array and total | Implemented |
| `GET` | `/alerts` | List all security alerts | Query: `camera_id`, `status`, `severity` | `AlertListResponse` with alerts array and total | Implemented |
| `POST` | `/alerts/{id}/resolve`| Resolve an active alert | Path: `id` (alert_id) | Updated `Alert` with `status: RESOLVED` | Implemented |
| `PATCH`| `/alerts/{id}/resolve`| Resolve an active alert (PATCH) | Path: `id` | Updated `Alert` with `status: RESOLVED` | Implemented |

### Intelligence & Zones (`/intelligence`, `/intelligence/zones`)
| Method | Endpoint | Description | Request / Params | Response Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/intelligence/zones` | List default zones | Query: `camera_id` (optional) | `ZoneListResponse` | Implemented |
| `POST` | `/intelligence/zones` | Create a zone configuration | `CreateZoneRequest` (JSON) | Created `ZoneConfig` | Implemented |
| `DELETE`| `/intelligence/zones/{id}`| Remove a zone configuration | Path: `id` (zone_id) | Deletion confirmation message | Implemented |
| `POST` | `/intelligence/evaluate` | Evaluate movement trajectory payload | `EvaluateMovementRequest` | Array of generated `Event` objects | Implemented |
| `POST` | `/intelligence/simulate` | Simulate an operational threat | `SimulateDetectionRequest` | Generated `Event` (and escalated `Alert`) | Implemented |
| `GET` | `/intelligence/zones/all`| List camera zones | None | Array of camera zone dictionaries | Implemented |
| `GET` | `/intelligence/zones/{id}`| Get zones for specific camera | Path: `id` (camera_id) | Zone dictionary (fence, restricted zone, direction) | Implemented |
| `POST` | `/intelligence/zones/config`| Update camera zone coordinates | `ZoneUpdateRequest` (JSON) | Updated zone coordinates status | Implemented |

### Analytics (`/analytics`)
| Method | Endpoint | Description | Request / Params | Response Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/analytics/summary` | Consolidated intelligence metrics | None | Detection aggregates, persons/vehicles, events | Implemented |
| `POST` | `/analytics/frame` | Single-frame ad-hoc analysis | Multipart form `file` | Raw detection, face, plate, and rule result | Implemented |

---

## 20. Testing

### Backend Automated Test Suite
The automated test suite is configured via [`pytest.ini`](file:///pytest.ini) and executed using Pytest:

```bash
pytest -v
```

#### Test Suite Breakdown (30 Passing Tests)
- **[`tests/test_health.py`](file:///tests/test_health.py)** (2 tests): Verifies `/health` endpoint structure, platform title, uptime calculation, and camera counts.
- **[`tests/test_streams_api.py`](file:///tests/test_streams_api.py)** (4 tests): Verifies stream connection, listing, duplicate rejection, and disconnection lifecycle.
- **[`tests/test_stream_worker.py`](file:///tests/test_stream_worker.py)** (5 tests): Verifies stream worker initialization, timeout detection, reconnection retry limits, and status transitions (`ONLINE` $\to$ `RECONNECTING` $\to$ `ERROR`).
- **[`tests/test_frame_processor.py`](file:///tests/test_frame_processor.py)** (5 tests): Verifies image normalization, grayscale-to-BGR conversion, aspect ratio maintenance, and invalid frame rejection.
- **[`tests/test_events_api.py`](file:///tests/test_events_api.py)** (4 tests): Verifies event logging, camera filtering, deduplication cooldown window, and automated alert escalation.
- **[`tests/test_alerts_api.py`](file:///tests/test_alerts_api.py)** (3 tests): Verifies alert creation, active/resolved status filtering, and one-click alert resolution.
- **[`tests/test_intelligence.py`](file:///tests/test_intelligence.py)** (7 tests): Verifies virtual fence line crossing, restricted zone point-in-polygon detection, loitering threshold evaluation, and threat simulation endpoints.

#### Offline Video Benchmark Scripts
In addition to the unit test suite, root-level scripts evaluate the computer vision pipeline on actual MP4 video files:
- **`test_full_pipeline.py`**: Runs `AnalyticsEngine` (YOLO + ByteTrack + all 7 analytics detectors) on `samples/test_border_feed.mp4` and exports the annotated video to `ibvap_analytics_output.mp4`.
- **`test_multi_object.py`**: Scans video frames and reports multi-class object detection counts across consecutive frames.
- **`test_video_frames.py`**: Tests OpenCV frame decoding and dimensions.

> **Note on Model Testing in CI**: The automated Pytest suite isolates tests with mock frames and unit models to ensure fast, deterministic execution without requiring GPU hardware or large model downloads. End-to-end model evaluation is executed via `test_full_pipeline.py`.

---

## 21. Sample CCTV Video Usage

The repository includes surveillance video clips in the `samples/` directory for immediate local testing without needing physical CCTV cameras:

| Sample File | Scenario / Focus Area | Recommended Test Purpose |
| :--- | :--- | :--- |
| `samples/test_border_feed.mp4` | Border outpost road & perimeter | End-to-end pipeline verification (`test_full_pipeline.py`) |
| `samples/Sample for CCTV.mp4` | Perimeter gate & highway transit | Vehicle detection, tracking, and virtual fence calibration |
| `samples/Sample2 for CCTV.mp4` | Multi-lane highway corridor | High-density multi-object tracking and lane classification |
| `samples/Sample3 class for CCTV.mp4` | Checkpoint vehicle classification | Vehicle classification across cars, trucks, and buses |
| `samples/Sample4 class movement for CCTV.mp4` | Perimeter movement corridor | Trajectory tracking, speed, and wrong-direction testing |
| `samples/Sample5 class loitering for CCTV.mp4` | Buffer sector observation post | Stationary dwell-time and loitering rule verification |
| `samples/Sample6 class cut for CCTV.mp4` | Fence approach scenario | Virtual tripwire line breach verification |
| `samples/Sample7 class adit for CCTV.mp4` | Restricted access corridor | Restricted zone polygon intrusion testing |

### Connecting a Sample Video via the Web Dashboard
1. Open the dashboard at `http://localhost:5173`.
2. Click **"+ Connect Camera"** in the navigation rail or command bar.
3. Select any of the **Sample CCTV Presets** from the modal gallery (or enter `samples/Sample for CCTV.mp4` under the **File** tab).
4. Ensure **Loop Video** is checked.
5. Click **"Connect Camera"**.
6. Navigate to **Live Operations** to view the live annotated feed, active bounding boxes, and rule evaluations.

---

## 22. Current Limitations

1. **Environmental & Lighting Sensitivity**:
   - Optical object detection accuracy declines during severe adverse weather (dense fog, heavy rainfall, sandstorms) and extreme camera glare.
   - Low-light night detection relies on ambient illumination or IR illuminators; total darkness without infrared illumination prevents optical detection.
2. **Prototype-Level ANPR & Face Detection**:
   - ANPR uses general English EasyOCR on vehicle crops rather than a trained license plate character recognition network. Plates obscured by mud, extreme angles, or poor lighting may yield partial or absent readings.
   - Face detection uses Haar Cascades to flag facial presence in near-field views; it does not perform identity verification or facial recognition against databases.
3. **In-Memory Volatile Persistence**:
   - Active streams, logged events, generated alerts, and custom zone coordinates are held in server memory. Restarting the backend resets the system state to default configurations.
4. **CPU Resource Constraints**:
   - Running multiple simultaneous streams with YOLOv8 and ByteTrack on entry-level CPU-only hardware will experience lower analytics frame rates (~5–10 FPS). Hardware GPU acceleration (CUDA) is recommended for production multi-stream deployment.
5. **No Production Authentication / Multi-Tenancy**:
   - The current API has no authentication or user session layer; all endpoints are open to the local network.
6. **No Distributed Orchestration**:
   - Designed to run on a single host machine or edge workstation; cluster distribution across multiple edge worker nodes is not yet supported.

---

## 23. Future Roadmap

- **Phase 3A: Persistence & Security (Short-Term)**:
  - PostgreSQL / TimescaleDB database backend for permanent event, alert, and zone persistence.
  - JWT-based authentication and role-based access control (Admin, Operator, Read-Only).
  - Multi-stage Docker containerization with GPU runtime support.
- **Phase 3B: Advanced Inference (Medium-Term)**:
  - Dedicated license plate localization and recognition pipeline (LPRNet / CRNN).
  - WebSocket telemetry streaming (`/ws/telemetry`) to replace polling.
  - Thermal / FLIR video stream ingestion and palette normalization.
  - Webhook dispatch for automated SMS, email, and radio dispatch upon Critical breaches.
- **Phase 3C: Enterprise Orchestration (Long-Term)**:
  - Cross-camera subject re-identification (Re-ID) across non-overlapping camera views.
  - Distributed edge worker node clustering managed via a central C2 server.
  - Hardware acceleration with TensorRT and ONNX Runtime for edge deployment on NVIDIA Jetson devices.

---

## 24. Development Note

**IBVAP (Intelligent Border Video Analytics Platform)** was conceptualized, architected, and developed as an independent engineering project by **Om Saxena**.

The project was created to demonstrate how modern computer vision pipelines (YOLO + ByteTrack) paired with an asynchronous FastAPI streaming engine and a bespoke mission-control interface (**FORGE COMMAND**) can transform legacy, non-AI CCTV cameras into an active, multi-camera tactical surveillance grid without requiring expensive proprietary hardware replacements.

---

## 25. License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.

```
MIT License

Copyright (c) 2026 Om Saxena

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Project-Use Note & Operational Disclaimer

- **Educational & Research Scope**: This repository is provided strictly for educational, research, demonstration, and evaluation purposes.
- **Surveillance Prototype**: The project demonstrates an AI-based intelligent video analytics prototype for border surveillance using commodity IP CCTV streams.
- **Open Access & Reuse**: The repository may be viewed, cloned, studied, modified, and reused according to the terms of the MIT License.
- **Attribution Requirement**: Proper attribution to the original author (Om Saxena) must be retained in all copies or substantial portions of the software, as required by the MIT License.
- **Operational Disclaimer**: This project is a proof-of-concept software prototype and should not be represented as an official government security system or deployed in an operational border-security environment without appropriate authorization, validation, security review, and operational testing.

### Repository Usage & Attribution

Under the MIT License:
- Developers, researchers, and evaluators are free to inspect, clone, branch, and experiment with the codebase locally.
- You are welcome to adapt the algorithms, user interface components, and analytical pipelines for academic research, portfolio demonstrations, and technical evaluations.
- Please retain the copyright notice and license text in derived distributions.

### Third-Party Software & Dependencies

The MIT License of this repository applies to the original architectural source code, custom analytical engines, API route implementations, and frontend interfaces authored for this project.

It does not claim ownership of third-party libraries, pretrained neural network weights, or external frameworks utilized as dependencies:
- **YOLO / Ultralytics**: Governed by the [Ultralytics License](https://github.com/ultralytics/ultralytics/blob/main/LICENSE).
- **EasyOCR**: Licensed under the [Apache 2.0 License](https://github.com/JaidedAI/EasyOCR/blob/master/LICENSE).
- **OpenCV**: Licensed under the [Apache 2.0 License](https://opencv.org/license/).
- **PyTorch**: Licensed under the [PyTorch BSD-style License](https://github.com/pytorch/pytorch/blob/main/LICENSE).
- **FastAPI / Uvicorn**: Licensed under the [MIT License](https://github.com/fastapi/fastapi/blob/master/LICENSE).
- **React / Vite / TypeScript**: Licensed under their respective open-source licenses (MIT / Apache 2.0).
- **Sample Media**: Video files located in `samples/` are included solely for algorithmic evaluation and demonstration purposes.

---

## 26. Disclaimer

This software is an independent research prototype engineered for technical evaluation and demonstration. It is not affiliated with, endorsed by, or sponsored by any government agency or defense department. Field deployment in life-critical or mission-critical perimeter security contexts requires certified hardware, hardened infrastructure, formal security compliance reviews, and authorized operational testing.
