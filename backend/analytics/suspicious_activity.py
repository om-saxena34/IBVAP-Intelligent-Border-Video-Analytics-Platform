from __future__ import annotations

import time
from collections import defaultdict
from typing import Any


class SuspiciousActivityScorer:
    """
    Rule-based Multi-Signal Border Threat & Suspicious Activity Risk Engine.

    Transparently correlates behavior signals across tracks:
    - Virtual Fence Breach (+35 pts)
    - Restricted Zone Entry (+40 pts)
    - Wrong Direction Movement (+25 pts)
    - Loitering / Prolonged Presence (+20 pts)
    - Night Movement (+20 pts)
    - Unusual Group Movement (+15 pts)

    Risk Levels:
    - 0-24: NORMAL
    - 25-49: LOW RISK
    - 50-69: MEDIUM RISK
    - 70-84: HIGH RISK
    - 85+: CRITICAL
    """

    SIGNAL_WEIGHTS = {
        "virtual_fence": 35,
        "virtual_fence_crossing": 35,
        "restricted_zone": 40,
        "restricted_zone_entry": 40,
        "wrong_direction": 25,
        "loitering": 20,
        "night_movement": 20,
        "group_movement": 15,
    }

    HUMAN_READABLE_REASONS = {
        "virtual_fence": "Virtual perimeter fence breach",
        "virtual_fence_crossing": "Virtual perimeter fence breach",
        "restricted_zone": "Restricted border zone entry",
        "restricted_zone_entry": "Restricted border zone entry",
        "wrong_direction": "Movement opposite to authorized direction",
        "loitering": "Prolonged loitering in observation sector",
        "night_movement": "Concealed movement under low-light/night conditions",
        "group_movement": "Unusual group formation along border line",
    }

    def __init__(self, cooldown_seconds: float = 8.0) -> None:
        self.cooldown_seconds = cooldown_seconds
        # track_id -> set of active signal types
        self._track_signals: dict[int, set[str]] = defaultdict(set)
        # track_id -> dict of signal -> first_seen timestamp
        self._track_timestamps: dict[int, dict[str, float]] = defaultdict(dict)
        # track_id -> last alert timestamp
        self._last_alert_time: dict[int, float] = {}

    def score_track(self, track_id: int) -> tuple[int, str, list[str]]:
        """Calculate score, risk level, and human-readable reasons for a track."""
        signals = self._track_signals.get(track_id, set())
        score = sum(self.SIGNAL_WEIGHTS.get(sig, 10) for sig in signals)
        score = min(100, score)

        if score >= 85:
            level = "CRITICAL"
        elif score >= 70:
            level = "HIGH RISK"
        elif score >= 50:
            level = "MEDIUM RISK"
        elif score >= 25:
            level = "LOW RISK"
        else:
            level = "NORMAL"

        reasons = [
            self.HUMAN_READABLE_REASONS.get(sig, sig.replace("_", " ").title())
            for sig in sorted(signals)
        ]

        return score, level, reasons

    def update(
        self,
        events: list[dict[str, Any]],
        active_tracks: set[int] | None = None,
        now: float | None = None,
        active_track_ids: set[int] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Record signals from newly evaluated events and return composite suspicious
        activity events when risk score >= 50 or multiple infractions occur.
        """
        tracks = active_tracks if active_tracks is not None else (active_track_ids or set())
        current_time = time.time() if now is None else now
        new_composite_events: list[dict[str, Any]] = []

        # Cleanup stale tracks no longer in active frame
        stale_tracks = set(self._track_signals.keys()) - tracks
        for st in stale_tracks:
            self._track_signals.pop(st, None)
            self._track_timestamps.pop(st, None)
            self._last_alert_time.pop(st, None)

        # Ingest incoming events
        for event in events:
            track_id = event.get("track_id")
            event_type = event.get("event_type") or event.get("type")
            if track_id is None or not event_type:
                continue

            clean_type = str(event_type).strip().lower().replace(" ", "_")
            if clean_type in self.SIGNAL_WEIGHTS:
                self._track_signals[track_id].add(clean_type)
                self._track_timestamps[track_id][clean_type] = current_time

        # Evaluate risk per active track
        for track_id in tracks:
            signals = self._track_signals.get(track_id, set())
            if not signals:
                continue

            score, level, reasons = self.score_track(track_id)

            # Trigger suspicious activity alert if score >= 50 or multiple infractions
            if score >= 50 or len(signals) >= 2:
                last_alert = self._last_alert_time.get(track_id, 0.0)
                if current_time - last_alert >= self.cooldown_seconds:
                    self._last_alert_time[track_id] = current_time
                    new_composite_events.append({
                        "event_type": "suspicious_activity",
                        "track_id": track_id,
                        "risk_score": score,
                        "risk_level": level,
                        "reasons": reasons,
                        "signals_count": len(signals),
                        "severity": "CRITICAL" if score >= 80 else "HIGH",
                        "timestamp": current_time,
                    })

        return new_composite_events
