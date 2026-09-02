"""
Validation schemas and Data Transfer Objects for the Google Meridian Python service.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class MediaChannelConfig(BaseModel):
    spendColumn: str
    channelName: Optional[str] = None
    impressionsColumn: Optional[str] = None
    channelType: Optional[str] = "other"


class MeridianModelFitConfig(BaseModel):
    dateColumn: str = "date"
    kpiColumn: str = "revenue"
    kpiType: str = "revenue"
    mediaChannels: List[MediaChannelConfig]
    controlColumns: Optional[List[str]] = []
    seasonalityFourierTerms: Optional[int] = 2
    mcmcChains: Optional[int] = 4
    mcmcDraws: Optional[int] = 1000
    mcmcWarmup: Optional[int] = 500
    priors: Optional[Dict[str, Any]] = {}


class MeridianFitRequest(BaseModel):
    rows: List[Dict[str, Any]]
    config: MeridianModelFitConfig


class ErrorResponse(BaseModel):
    status: str = "error"
    engine: str = "google-meridian"
    errors: List[Dict[str, str]]
