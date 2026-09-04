"""
API router package for IBVAP.
"""
from backend.api.health import router as health_router
from backend.api.streams import router as streams_router

__all__ = ["health_router", "streams_router"]
