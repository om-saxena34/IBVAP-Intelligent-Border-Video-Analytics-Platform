"""
Application configuration for IBVAP.
Supports environment variables and .env file if available.
"""
import os
from typing import List
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """System-wide runtime settings."""
    API_TITLE: str = Field(
        default="IBVAP — Intelligent Border Video Analytics Platform",
        description="Application title",
    )
    API_VERSION: str = Field(
        default="1.0.0-phase1",
        description="API version",
    )
    API_PREFIX: str = Field(
        default="",
        description="Root API prefix",
    )
    DEBUG: bool = Field(
        default=False,
        description="Debug mode",
    )
    HOST: str = Field(
        default="0.0.0.0",
        description="Host to bind server",
    )
    PORT: int = Field(
        default=8000,
        description="Port to listen on",
    )
    # Stream worker parameters
    STREAM_TIMEOUT_SEC: float = Field(
        default=5.0,
        description="Seconds without receiving a frame before marking stream OFFLINE",
    )
    DEFAULT_RECONNECT_INTERVAL_SEC: float = Field(
        default=3.0,
        description="Delay in seconds between reconnect attempts for lost streams",
    )
    MAX_RECONNECT_ATTEMPTS: int = Field(
        default=10,
        description="Maximum reconnect attempts before marking stream as ERROR",
    )
    FRAME_BUFFER_MAX_SIZE: int = Field(
        default=10,
        description="Maximum frames stored in circular buffer per stream",
    )
    # Security / CORS
    CORS_ORIGINS: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins for command dashboard",
    )

    @classmethod
    def from_env(cls) -> "Settings":
        """Instantiate settings with environment overrides."""
        return cls(
            API_TITLE=os.getenv("IBVAP_API_TITLE", "IBVAP — Intelligent Border Video Analytics Platform"),
            API_VERSION=os.getenv("IBVAP_API_VERSION", "1.0.0-phase1"),
            API_PREFIX=os.getenv("IBVAP_API_PREFIX", ""),
            DEBUG=os.getenv("IBVAP_DEBUG", "false").lower() in ("true", "1", "yes"),
            HOST=os.getenv("IBVAP_HOST", "0.0.0.0"),
            PORT=int(os.getenv("IBVAP_PORT", "8000")),
            STREAM_TIMEOUT_SEC=float(os.getenv("IBVAP_STREAM_TIMEOUT_SEC", "5.0")),
            DEFAULT_RECONNECT_INTERVAL_SEC=float(os.getenv("IBVAP_RECONNECT_INTERVAL_SEC", "3.0")),
            MAX_RECONNECT_ATTEMPTS=int(os.getenv("IBVAP_MAX_RECONNECT_ATTEMPTS", "10")),
            FRAME_BUFFER_MAX_SIZE=int(os.getenv("IBVAP_FRAME_BUFFER_MAX_SIZE", "10")),
            CORS_ORIGINS=os.getenv("IBVAP_CORS_ORIGINS", "*").split(","),
        )


settings = Settings.from_env()
